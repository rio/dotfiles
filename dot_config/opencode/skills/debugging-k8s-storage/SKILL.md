---
name: debugging-k8s-storage
description: Debugs Kubernetes storage issues including PVC stuck in Pending, PV binding failures, volume mount errors, and StorageClass problems. Use when volumes fail to mount, PVCs not binding, or storage-related pod failures.
allowed-tools: Bash
---

# Debugging Kubernetes Storage

Investigates PersistentVolumeClaim, PersistentVolume, and mount issues.

## Common Storage Issues

| Symptom | Likely Cause | First Check |
|---------|-------------|-------------|
| PVC Pending | No matching PV, StorageClass issue | PVC events |
| Mount failed | PV not available, node issue | Pod events |
| Multi-attach error | RWO volume on multiple nodes | Access mode |
| Permission denied | fsGroup/runAsUser mismatch | Security context |

## Investigation Workflow

### Step 1: Check PVC Status

```bash
# List PVCs
kubectl get pvc -n <ns>

# Detailed PVC info
kubectl describe pvc <pvc> -n <ns>
```

**PVC Pending?** Check Events section for reason.

### Step 2: Check PV Binding

```bash
# List PVs
kubectl get pv

# Check PV details
kubectl describe pv <pv-name>
```

PVC binds to PV when:
- StorageClass matches (or empty for static)
- Access modes compatible
- Capacity sufficient

### Step 3: Check StorageClass

```bash
# List StorageClasses
kubectl get storageclass

# Check default StorageClass
kubectl get storageclass -o jsonpath='{range .items[?(@.metadata.annotations.storageclass\.kubernetes\.io/is-default-class=="true")]}{.metadata.name}{end}'

# StorageClass details
kubectl describe storageclass <name>
```

### Step 4: Check Pod Mount Events

```bash
# Pod events show mount failures
kubectl describe pod <pod> -n <ns> | grep -A10 "Events:"

# Events for PVC
kubectl get events -n <ns> --field-selector involvedObject.name=<pvc>
```

## Specific Issues

### PVC Stuck in Pending

Common reasons:
1. **No matching PV** (static provisioning)
2. **StorageClass can't provision** (dynamic provisioning)
3. **Capacity not available**
4. **Wrong access mode**

```bash
# Check what the PVC is requesting
kubectl get pvc <pvc> -n <ns> -o yaml | grep -A5 "spec:"

# Check events for provisioning errors
kubectl describe pvc <pvc> -n <ns> | grep -A10 "Events:"
```

### Multi-Attach Error

```bash
# Check access mode (RWO = ReadWriteOnce = single node)
kubectl get pvc <pvc> -n <ns> -o jsonpath='{.spec.accessModes}'

# Check which node has the volume
kubectl get pod -n <ns> -o wide
```

RWO volumes can only attach to one node. If pods are on different nodes, one will fail.

Options:
- Use ReadWriteMany (RWX) if storage supports it
- Ensure pods schedule to same node

### Volume Mount Timeout

```bash
# Check node where pod is scheduled
kubectl get pod <pod> -n <ns> -o jsonpath='{.spec.nodeName}'

# Check node conditions
kubectl describe node <node> | grep -A5 "Conditions:"
```

May indicate:
- Cloud provider API issues
- Node can't reach storage backend
- CSI driver problems

### Permission Denied on Volume

```bash
# Check pod security context
kubectl get pod <pod> -n <ns> -o jsonpath='{.spec.securityContext}'

# Check container security context
kubectl get pod <pod> -n <ns> -o jsonpath='{.spec.containers[*].securityContext}'
```

Fix with fsGroup or runAsUser in pod spec.

## Quick Debug Commands

```bash
# Overview of all PVC/PV
kubectl get pvc,pv -A

# Check CSI drivers (if using CSI)
kubectl get csidrivers

# Storage-related events
kubectl get events -A --field-selector reason=FailedMount
kubectl get events -A --field-selector reason=FailedAttachVolume
```

## Access Modes Reference

| Mode | Short | Description |
|------|-------|-------------|
| ReadWriteOnce | RWO | Single node read-write |
| ReadOnlyMany | ROX | Multiple nodes read-only |
| ReadWriteMany | RWX | Multiple nodes read-write |
| ReadWriteOncePod | RWOP | Single pod read-write |

## Notes

- Load `debugging-k8s-pods` if pod has other issues besides storage
- Load `analyzing-k8s-events` for storage event timeline
