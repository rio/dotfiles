---
name: triaging-k8s-issues
description: Performs initial Kubernetes diagnosis to identify problem category and route to specialized skills. Use when debugging K8s issues, pods not working, services unreachable, deployments failing, or general cluster problems.
allowed-tools: Bash
---

# Triaging Kubernetes Issues

Performs initial diagnosis to identify the problem category and load the appropriate specialized skill.

## Quick Diagnosis

```bash
# Check for non-running pods (cluster-wide or specific namespace)
kubectl get pods -A | grep -v Running | grep -v Completed

# Or for a specific namespace
kubectl get pods -n <namespace> --field-selector=status.phase!=Running,status.phase!=Succeeded

# Check recent events
kubectl get events -A --sort-by=.lastTimestamp | head -30
```

## Issue Category Routing

| Symptom | Skill to Load |
|---------|---------------|
| CrashLoopBackOff, ImagePullBackOff, OOMKilled, container errors | `debugging-k8s-pods` |
| Service unreachable, DNS failures, Ingress not routing | `debugging-k8s-networking` |
| PVC Pending, volume mount failures | `debugging-k8s-storage` |
| Forbidden errors, permission denied | `debugging-k8s-rbac` |
| Pod Pending (no node), taint/affinity issues | `debugging-k8s-scheduling` |
| Resource quota exceeded, LimitRange violations | `debugging-k8s-resources` |

## Triage Workflow

1. **Identify the affected resource**
   - Ask user for namespace and resource name if not provided
   - Run `kubectl get pods -n <ns>` to see current state

2. **Check pod status**
   ```bash
   kubectl get pods -n <namespace> -o wide
   ```

3. **Check recent events for the namespace**
   ```bash
   kubectl get events -n <namespace> --sort-by=.lastTimestamp | head -20
   ```

4. **Get quick pod details if specific pod identified**
   ```bash
   kubectl describe pod <pod-name> -n <namespace> | head -80
   ```

5. **Route to specialized skill** based on findings

## Common Status Meanings

| Status | Meaning |
|--------|---------|
| Pending | Not scheduled yet (check scheduling skill) |
| ContainerCreating | Pulling image or mounting volumes |
| Running | Container running (check logs if misbehaving) |
| CrashLoopBackOff | Container crashing repeatedly |
| ImagePullBackOff | Cannot pull container image |
| Terminating | Pod being deleted (may be stuck) |
| Evicted | Node evicted the pod |

## Notes

- All commands are read-only (get, describe, logs)
- Use `-n <namespace>` when namespace is known
- Use `-A` (all namespaces) for cluster-wide overview
- After identifying the issue category, load the appropriate specialized skill for detailed debugging
