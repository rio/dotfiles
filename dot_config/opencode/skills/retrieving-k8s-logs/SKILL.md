---
name: retrieving-k8s-logs
description: Retrieves Kubernetes container logs with various patterns including multi-container pods, previous container logs, init containers, and label-based aggregation. Use when checking application logs, debugging crashes, or analyzing container output.
allowed-tools: Bash
---

# Retrieving Kubernetes Logs

Patterns for retrieving container logs effectively.

## Basic Log Commands

```bash
# Current container logs
kubectl logs <pod> -n <ns>

# Last N lines
kubectl logs <pod> -n <ns> --tail=100

# Logs since time
kubectl logs <pod> -n <ns> --since=1h
kubectl logs <pod> -n <ns> --since=30m

# With timestamps
kubectl logs <pod> -n <ns> --timestamps
```

## Multi-Container Pods

```bash
# List containers in pod
kubectl get pod <pod> -n <ns> -o jsonpath='{.spec.containers[*].name}'

# Logs from specific container
kubectl logs <pod> -n <ns> -c <container>

# Logs from all containers
kubectl logs <pod> -n <ns> --all-containers
```

## Previous Container (After Crash)

```bash
# Logs from previous container instance (after restart/crash)
kubectl logs <pod> -n <ns> --previous

# Previous logs from specific container
kubectl logs <pod> -n <ns> -c <container> --previous
```

Use `--previous` when:
- Pod is in CrashLoopBackOff
- Container restarted and you need pre-crash logs
- Current container logs don't show the error

## Init Container Logs

```bash
# List init containers
kubectl get pod <pod> -n <ns> -o jsonpath='{.spec.initContainers[*].name}'

# Get init container logs
kubectl logs <pod> -n <ns> -c <init-container-name>
```

## Label-Based Log Aggregation

```bash
# Logs from all pods with label
kubectl logs -l app=<app-name> -n <ns>

# With tail limit per pod
kubectl logs -l app=<app-name> -n <ns> --tail=50

# All containers in labeled pods
kubectl logs -l app=<app-name> -n <ns> --all-containers
```

## Searching Logs

```bash
# Grep for pattern
kubectl logs <pod> -n <ns> | grep -i error

# Grep with context
kubectl logs <pod> -n <ns> | grep -i -A5 -B5 "exception"

# Count occurrences
kubectl logs <pod> -n <ns> | grep -c "error"
```

## Log Patterns for Debugging

### Application Crash

```bash
# Get last 200 lines before crash
kubectl logs <pod> -n <ns> --previous --tail=200

# Look for error/exception
kubectl logs <pod> -n <ns> --previous | grep -i -E "error|exception|fatal|panic"
```

### Startup Issues

```bash
# First 100 lines (startup)
kubectl logs <pod> -n <ns> | head -100

# Check init containers first
kubectl logs <pod> -n <ns> -c <init-container> 
```

### Intermittent Issues

```bash
# Logs from last 2 hours with timestamps
kubectl logs <pod> -n <ns> --since=2h --timestamps

# Tail and follow (for live debugging)
# Note: This blocks, use Ctrl+C to stop
kubectl logs <pod> -n <ns> -f --tail=50
```

### Memory Issues (OOM)

```bash
# Check for memory-related messages before OOM
kubectl logs <pod> -n <ns> --previous | grep -i -E "memory|heap|oom|gc"
```

## Log Output Formats

```bash
# Raw logs (default)
kubectl logs <pod> -n <ns>

# With pod name prefix (useful for multi-pod)
kubectl logs -l app=<app> -n <ns> --prefix

# Limit bytes (for huge logs)
kubectl logs <pod> -n <ns> --limit-bytes=50000
```

## Quick Debugging Pattern

```bash
# 1. Check current logs for errors
kubectl logs <pod> -n <ns> --tail=100 | grep -i error

# 2. If pod crashed, check previous logs
kubectl logs <pod> -n <ns> --previous --tail=200

# 3. If init container failed
kubectl get pod <pod> -n <ns> -o jsonpath='{.spec.initContainers[*].name}'
kubectl logs <pod> -n <ns> -c <init-container>

# 4. Check all containers in pod
kubectl logs <pod> -n <ns> --all-containers --tail=50
```

## Notes

- `--previous` only works if container restarted (keeps one previous log)
- Logs are ephemeral; they're lost when pod is deleted
- For persistent logs, use a logging stack (EFK, Loki, etc.)
- Load `debugging-k8s-pods` for container state analysis
