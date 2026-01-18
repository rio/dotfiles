---
name: analyzing-k8s-events
description: Analyzes Kubernetes cluster events to understand what happened and when. Use when investigating incidents, checking warnings, building event timeline, or understanding cluster activity.
allowed-tools: Bash
---

# Analyzing Kubernetes Events

Investigates cluster and namespace events to build timeline and identify issues.

## Quick Event Commands

```bash
# Recent events in namespace (sorted by time)
kubectl get events -n <ns> --sort-by=.lastTimestamp

# Recent events cluster-wide
kubectl get events -A --sort-by=.lastTimestamp | head -50

# Warning events only
kubectl get events -n <ns> --field-selector type=Warning

# Events in last hour
kubectl get events -n <ns> --sort-by=.lastTimestamp | head -30
```

## Filtering Events

### By Resource

```bash
# Events for specific pod
kubectl get events -n <ns> --field-selector involvedObject.name=<pod>

# Events for specific deployment
kubectl get events -n <ns> --field-selector involvedObject.name=<deployment>,involvedObject.kind=Deployment

# Events for specific PVC
kubectl get events -n <ns> --field-selector involvedObject.kind=PersistentVolumeClaim
```

### By Type

```bash
# Warning events (problems)
kubectl get events -n <ns> --field-selector type=Warning

# Normal events
kubectl get events -n <ns> --field-selector type=Normal
```

### By Reason

```bash
# Common failure reasons
kubectl get events -A --field-selector reason=Failed
kubectl get events -A --field-selector reason=FailedScheduling
kubectl get events -A --field-selector reason=FailedMount
kubectl get events -A --field-selector reason=BackOff
kubectl get events -A --field-selector reason=Unhealthy
kubectl get events -A --field-selector reason=OOMKilling
```

## Common Event Reasons

| Reason | Meaning | Action |
|--------|---------|--------|
| FailedScheduling | No node can run pod | Load `debugging-k8s-scheduling` |
| FailedMount | Volume mount failed | Load `debugging-k8s-storage` |
| BackOff | Container crashing | Load `debugging-k8s-pods` |
| Unhealthy | Probe failing | Check liveness/readiness probe |
| Killing | Pod being terminated | Check termination reason |
| Pulled | Image pulled successfully | Informational |
| Created | Container created | Informational |
| Started | Container started | Informational |

## Event Timeline Analysis

### Build Timeline for Incident

```bash
# Wide output with timestamps
kubectl get events -n <ns> --sort-by=.lastTimestamp -o wide

# Custom columns for analysis
kubectl get events -n <ns> --sort-by=.lastTimestamp \
  -o custom-columns=TIME:.lastTimestamp,TYPE:.type,REASON:.reason,OBJECT:.involvedObject.name,MESSAGE:.message
```

### Correlate Events Across Resources

```bash
# Events mentioning a specific string
kubectl get events -n <ns> -o json | jq '.items[] | select(.message | contains("<search-term>"))'

# Or using grep
kubectl get events -n <ns> --sort-by=.lastTimestamp -o wide | grep <term>
```

## Event Details

```bash
# Full event details (JSON)
kubectl get events -n <ns> --field-selector involvedObject.name=<resource> -o json

# Key fields to examine:
# - reason: short reason code
# - message: detailed message
# - type: Normal or Warning
# - count: how many times this event occurred
# - firstTimestamp/lastTimestamp: time range
```

## Event Retention

Events are stored in etcd with limited retention (default ~1 hour). For older events:
- Check logging system (if deployed)
- Check monitoring/alerting history
- Events are ephemeral, don't rely on them for long-term history

## Quick Investigation Pattern

```bash
# 1. Get recent warnings
kubectl get events -n <ns> --field-selector type=Warning --sort-by=.lastTimestamp

# 2. Focus on specific resource
kubectl get events -n <ns> --field-selector involvedObject.name=<resource> --sort-by=.lastTimestamp

# 3. Get full details if needed
kubectl describe <resource-type> <resource-name> -n <ns>
```

## Notes

- Events are ephemeral (typically 1 hour retention)
- Warning type events indicate problems
- Normal type events are informational
- After identifying issue type, load specialized skill for deeper investigation
