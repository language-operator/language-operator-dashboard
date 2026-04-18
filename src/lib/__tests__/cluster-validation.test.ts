/**
 * @jest-environment node
 *
 * Unit tests for validateClusterRef and validateResourceBelongsToCluster.
 *
 * Key invariant: resources are fetched from a namespace named after their cluster,
 * so namespace scoping already guarantees membership. A missing spec.clusterRef
 * must NOT cause the resource to be silently excluded.
 */

// next/server can't initialise in a plain Node test environment
jest.mock('next/server', () => ({
  NextResponse: { json: jest.fn() },
}))

import { validateClusterRef, validateResourceBelongsToCluster } from '../cluster-validation'
import { OrphanedResourceError, InvalidClusterNameError } from '../api-error-handler'

// validateClusterExists uses k8sClient — mock it so the import doesn't blow up
jest.mock('../k8s-client', () => ({ k8sClient: {} }))

function makeResource(clusterRef?: string) {
  return {
    apiVersion: 'langop.io/v1alpha1',
    kind: 'LanguageAgent',
    metadata: { name: 'test-agent' },
    spec: clusterRef !== undefined ? { clusterRef } : {},
  }
}

// ── validateClusterRef ────────────────────────────────────────────────────────

describe('validateClusterRef', () => {
  it('passes when clusterRef matches expected cluster', () => {
    expect(() =>
      validateClusterRef(makeResource('my-cluster'), 'my-cluster')
    ).not.toThrow()
  })

  it('throws OrphanedResourceError when clusterRef points to a different cluster', () => {
    expect(() =>
      validateClusterRef(makeResource('other-cluster'), 'my-cluster')
    ).toThrow(OrphanedResourceError)
  })

  it('passes when clusterRef is absent and allowOrphanedResources is true', () => {
    expect(() =>
      validateClusterRef(makeResource(), 'my-cluster', { allowOrphanedResources: true })
    ).not.toThrow()
  })

  it('throws OrphanedResourceError when clusterRef is absent and allowOrphanedResources is false', () => {
    expect(() =>
      validateClusterRef(makeResource(), 'my-cluster', { allowOrphanedResources: false })
    ).toThrow(OrphanedResourceError)
  })

  it('throws InvalidClusterNameError when clusterRef is absent and requireClusterRef is true', () => {
    expect(() =>
      validateClusterRef(makeResource(), 'my-cluster', { requireClusterRef: true })
    ).toThrow(InvalidClusterNameError)
  })
})

// ── validateResourceBelongsToCluster ─────────────────────────────────────────

describe('validateResourceBelongsToCluster', () => {
  it('includes resources that have a matching clusterRef', () => {
    const resources = [makeResource('my-cluster')]
    const result = validateResourceBelongsToCluster(resources, 'my-cluster')
    expect(result).toHaveLength(1)
  })

  it('includes resources with no clusterRef when allowOrphanedResources is true', () => {
    const resources = [makeResource()]
    const result = validateResourceBelongsToCluster(resources, 'my-cluster', {
      allowOrphanedResources: true,
    })
    expect(result).toHaveLength(1)
  })

  it('silently excludes resources whose clusterRef points to a different cluster', () => {
    const resources = [makeResource('other-cluster')]
    const result = validateResourceBelongsToCluster(resources, 'my-cluster', {
      allowOrphanedResources: true,
    })
    expect(result).toHaveLength(0)
  })

  it('handles mixed resources: with clusterRef, without clusterRef, and mismatched', () => {
    const withRef = makeResource('my-cluster')
    const withoutRef = makeResource()
    const mismatchedRef = makeResource('other-cluster')

    const result = validateResourceBelongsToCluster(
      [withRef, withoutRef, mismatchedRef],
      'my-cluster',
      { allowOrphanedResources: true }
    )
    // matching clusterRef and missing clusterRef are both included; mismatched is excluded
    expect(result).toHaveLength(2)
    expect(result).toContain(withRef)
    expect(result).toContain(withoutRef)
  })

  it('excludes resources with no clusterRef when allowOrphanedResources is false', () => {
    const resources = [makeResource('my-cluster'), makeResource()]
    expect(() =>
      validateResourceBelongsToCluster(resources, 'my-cluster', { allowOrphanedResources: false })
    ).toThrow(OrphanedResourceError)
  })
})
