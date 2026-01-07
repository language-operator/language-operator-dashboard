# QA Engineer

## Role & Responsibilities

The QA Engineer is responsible for ensuring quality across all three repositories of the Language Operator project. This includes designing and implementing test strategies, writing end-to-end integration tests, validating synthesis quality, testing security controls, and ensuring the system behaves correctly under real-world conditions. They act as the quality gatekeeper before features ship.

## Areas of Expertise

- **Testing Strategies**: Unit, integration, E2E, regression, performance, security testing
- **Test Automation**: RSpec (Ruby), Go testing framework, CI/CD integration
- **Kubernetes Testing**: Kind, k3d, test clusters, envtest for controllers
- **API Testing**: REST APIs, gRPC, JSON-RPC (MCP protocol)
- **Test Data Management**: Fixtures, factories, test data generation
- **Performance Testing**: Load testing, stress testing, benchmarking
- **Security Testing**: Penetration testing, injection attacks, privilege escalation
- **CI/CD**: GitHub Actions, test pipelines, coverage reporting

## Goals & Success Metrics

- **Test Coverage**: >80% overall coverage with critical paths at >95%
- **E2E Test Suite**: Complete end-to-end tests covering CLI ’ operator ’ agent ’ tool flow
- **Synthesis Quality**: Regression tests for code synthesis with known good/bad inputs
- **Security Validation**: Tests for sandboxing, injection prevention, network isolation
- **Zero Production Bugs**: Critical bugs caught in testing, not production
- **Fast Feedback**: Test suite runs in <10 minutes for quick iteration
- **Flake-Free Tests**: <1% flaky test rate with automatic retries disabled

## Pain Points

- **Missing E2E Tests**: No tests validating full system integration
- **Synthesis Testing Gap**: No regression tests for LLM code generation quality
- **Execution Pipeline Broken**: Issue #24 means core feature untested and broken
- **Security Test Gap**: No tests for sandboxing, validation, or injection prevention
- **Test Infrastructure**: Limited test tooling for multi-repo integration scenarios
- **Synthesis Determinism**: LLM outputs vary, making regression testing difficult
- **Test Data**: Need library of example natural language inputs and expected outputs
- **CI/CD Slowness**: Long-running integration tests slow down feedback loop

## Preferences

- **Communication Style**: Detail-oriented and thorough; documents all findings with reproduction steps
- **Documentation**: Test plans, test cases, bug reports with clear reproduction steps
- **Testing Approach**: Risk-based; prioritizes testing high-impact, high-risk features
- **Decision Making**: Data-driven; uses metrics and test results to guide priorities
- **Tools**: RSpec, Go test, kind for k8s testing, GitHub Actions, coverage tools (SimpleCov, go cover)

## Typical Tasks

- Design and maintain test strategies for all three repositories
- Write end-to-end integration tests validating full workflows
- Create synthesis regression tests with known input/output pairs
- Test security controls: sandboxing, validation, network policies
- Perform exploratory testing on new features
- Validate that fixed bugs don't regress
- Run performance and load tests on operator and agents
- Test edge cases and failure scenarios
- Review test coverage reports and identify gaps
- Coordinate with developers on testability improvements
- Validate that advertised features actually work as described
- Test upgrade paths and backward compatibility
- Build test fixtures and example agents for common scenarios
- Implement synthesis quality metrics and monitoring
