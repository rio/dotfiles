---
name: debugging-k8s-pods
description: Debugs Kubernetes pod failures including CrashLoopBackOff, OOMKilled, ImagePullBackOff, init container failures, and CreateContainerConfigError. Use when pods crash, restart repeatedly, fail to start, or show container errors.
allowed-tools: Bash
---

# Debugging Kubernetes Pods

Investigates pod lifecycle issues and container failures.

## Pod Failure Patterns

| Status | Likely Cause | First Check |
|--------|-------------|-------------|
| CrashLoopBackOff | App crash or misconfiguration | Logs + exit code |
| ImagePullBackOff | Wrong image, missing tag, auth failure | Image name + pull secret |
| OOMKilled | Memory limit exceeded | Resource limits vs actual usage |
| CreateContainerConfigError | Missing ConfigMap/Secret | Referenced configs exist |
| Init:Error | Init container failed | Init container logs |
| Pending | Scheduling issue | Load `debugging-k8s-scheduling` |

## Investigation Workflow

### Step 1: Get Pod Status

```bash
kubectl get pod <pod> -n <ns> -o wide
kubectl describe pod <pod> -n <ns>
```

Look for:
- **Status** and **Reason** fields
- **Last State** for exit codes
- **Events** section at bottom

### Step 2: Check Container Logs

```bash
# Current container logs
kubectl logs <pod> -n <ns>

# Previous crashed container logs
kubectl logs <pod> -n <ns> --previous

# Specific container in multi-container pod
kubectl logs <pod> -n <ns> -c <container>

# Init container logs
kubectl logs <pod> -n <ns> -c <init-container-name>
```

### Step 3: Exit Code Analysis

| Exit Code | Meaning |
|-----------|---------|
| 0 | Success (check why it exited) |
| 1 | Application error |
| 137 | SIGKILL (OOMKilled or external kill) |
| 139 | SIGSEGV (segmentation fault) |
| 143 | SIGTERM (graceful shutdown requested) |

Get exit code:
```bash
kubectl get pod <pod> -n <ns> -o jsonpath='{.status.containerStatuses[0].lastState.terminated.exitCode}'
```

## Specific Issues

### CrashLoopBackOff

```bash
# Check logs from crashed container
kubectl logs <pod> -n <ns> --previous

# Check restart count and last state
kubectl get pod <pod> -n <ns> -o jsonpath='{.status.containerStatuses[0].restartCount}'
```

Common causes:
- Application startup failure
- Missing environment variables
- Missing dependencies (files, services)
- Liveness probe failing too quickly

### ImagePullBackOff

```bash
# Check image name in events
kubectl describe pod <pod> -n <ns> | grep -A5 "Events:"

# Check if pull secret exists
kubectl get secrets -n <ns>
```

Common causes:
- Typo in image name or tag
- Private registry without imagePullSecret
- Tag doesn't exist (e.g., `latest` removed)

### OOMKilled

```bash
# Check memory limits
kubectl get pod <pod> -n <ns> -o jsonpath='{.spec.containers[*].resources}'

# Check if OOMKilled
kubectl get pod <pod> -n <ns> -o jsonpath='{.status.containerStatuses[0].lastState.terminated.reason}'
```

If OOMKilled: either increase memory limits or investigate memory leak.

### CreateContainerConfigError

```bash
# Check what ConfigMap/Secret is referenced
kubectl get pod <pod> -n <ns> -o yaml | grep -A10 "env:\|envFrom:\|volumes:"

# Verify ConfigMap exists
kubectl get configmap -n <ns>

# Verify Secret exists
kubectl get secrets -n <ns>
```

### Init Container Failures

```bash
# List init containers
kubectl get pod <pod> -n <ns> -o jsonpath='{.spec.initContainers[*].name}'

# Check init container logs
kubectl logs <pod> -n <ns> -c <init-container-name>
```

## Quick Debug Commands

```bash
# Full pod YAML for deep inspection
kubectl get pod <pod> -n <ns> -o yaml

# Events for this pod only
kubectl get events -n <ns> --field-selector involvedObject.name=<pod>

# Check all containers status
kubectl get pod <pod> -n <ns> -o jsonpath='{range .status.containerStatuses[*]}{.name}: {.state}{"\n"}{end}'
```

## Notes

- Load `retrieving-k8s-logs` for advanced log patterns
- Load `debugging-k8s-resources` if OOMKilled due to limits
- Load `debugging-k8s-scheduling` if stuck in Pending
