---
name: debugging-k8s-resources
description: Debugs Kubernetes resource quota and limit issues including ResourceQuota exceeded, LimitRange violations, OOMKilled due to memory limits, and CPU throttling. Use when hitting quota limits, container resource constraint errors, or capacity issues.
allowed-tools: Bash
---

# Debugging Kubernetes Resources

Investigates resource quotas, limits, requests, and capacity issues.

## Common Resource Issues

| Symptom | Likely Cause | First Check |
|---------|-------------|-------------|
| Pod rejected | ResourceQuota exceeded | Namespace quota |
| OOMKilled | Memory limit too low | Container limits |
| Slow performance | CPU throttling | CPU limits |
| Pod Pending | Insufficient cluster resources | Node capacity |

## Investigation Workflow

### Step 1: Check Namespace Quotas

```bash
# List ResourceQuotas
kubectl get resourcequota -n <ns>

# Quota details (usage vs limit)
kubectl describe resourcequota -n <ns>
```

ResourceQuota limits total resources in a namespace.

### Step 2: Check LimitRange

```bash
# List LimitRanges
kubectl get limitrange -n <ns>

# LimitRange details
kubectl describe limitrange -n <ns>
```

LimitRange sets default/min/max for individual containers.

### Step 3: Check Pod Resource Usage

```bash
# Current resource usage (requires metrics-server)
kubectl top pods -n <ns>

# Resource requests/limits on pod
kubectl get pod <pod> -n <ns> -o jsonpath='{.spec.containers[*].resources}'

# Formatted output
kubectl get pod <pod> -n <ns> -o json | jq '.spec.containers[] | {name, resources}'
```

### Step 4: Check Node Capacity

```bash
# Node resource capacity and allocatable
kubectl describe node <node> | grep -A5 "Capacity:\|Allocatable:"

# Resource usage per node
kubectl top nodes

# Pods on a node and their requests
kubectl describe node <node> | grep -A100 "Non-terminated Pods"
```

## Specific Issues

### ResourceQuota Exceeded

```bash
# Check current quota usage
kubectl describe resourcequota -n <ns>

# Example output interpretation:
# Name:            mem-cpu-quota
# Resource         Used    Hard
# --------         ----    ----
# limits.cpu       4       4     ← At limit!
# limits.memory    4Gi     4Gi   ← At limit!
# requests.cpu     2       4
# requests.memory  2Gi     4Gi
```

If at quota limit:
- Delete unused pods
- Reduce resource requests/limits
- Request quota increase

### OOMKilled Container

```bash
# Check if OOMKilled
kubectl get pod <pod> -n <ns> -o jsonpath='{.status.containerStatuses[0].lastState.terminated.reason}'

# Check memory limit
kubectl get pod <pod> -n <ns> -o jsonpath='{.spec.containers[*].resources.limits.memory}'

# Check actual memory usage before kill (if metrics available)
kubectl top pod <pod> -n <ns>
```

OOMKilled means container exceeded its memory limit. Options:
- Increase memory limit
- Fix memory leak in application
- Tune JVM/runtime heap settings

### CPU Throttling

```bash
# Check CPU limits
kubectl get pod <pod> -n <ns> -o jsonpath='{.spec.containers[*].resources.limits.cpu}'

# Current CPU usage
kubectl top pod <pod> -n <ns>
```

CPU throttling happens when container tries to use more CPU than its limit. Signs:
- High latency
- Slow response times
- CPU usage at limit

Options:
- Increase CPU limit
- Remove CPU limit (use request only)
- Optimize application

### LimitRange Violation

```bash
# Check LimitRange defaults
kubectl describe limitrange -n <ns>

# Common violation: pod has no resources defined
# LimitRange applies defaults, but pod might exceed max
```

LimitRange can:
- Set default requests/limits
- Set min/max per container
- Set max ratio of limit/request

### Insufficient Cluster Resources

```bash
# Check node allocatable resources
kubectl describe nodes | grep -A5 "Allocatable:"

# Check what's consuming resources
kubectl top pods -A --sort-by=memory | head -20
kubectl top pods -A --sort-by=cpu | head -20

# Check pending pods waiting for resources
kubectl get pods -A --field-selector=status.phase=Pending
```

## Resource Quick Reference

| Resource | Request | Limit |
|----------|---------|-------|
| CPU | Guaranteed minimum | Maximum allowed |
| Memory | Guaranteed minimum | Maximum (OOMKill if exceeded) |

Units:
- CPU: `100m` = 0.1 core, `1` = 1 core
- Memory: `128Mi`, `1Gi`, etc.

## Quick Debug Commands

```bash
# Overview: quotas and limits in namespace
kubectl get resourcequota,limitrange -n <ns>

# All pods with their resource requests
kubectl get pods -n <ns> -o custom-columns=NAME:.metadata.name,CPU_REQ:.spec.containers[*].resources.requests.cpu,MEM_REQ:.spec.containers[*].resources.requests.memory

# Pods without resource limits (potential issue)
kubectl get pods -n <ns> -o json | jq '.items[] | select(.spec.containers[].resources.limits == null) | .metadata.name'
```

## Notes

- Load `debugging-k8s-scheduling` if pods Pending due to no schedulable node
- Load `debugging-k8s-pods` for OOMKilled investigation
- ResourceQuota is namespace-scoped
- LimitRange provides per-container defaults
