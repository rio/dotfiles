---
name: debugging-k8s-scheduling
description: Debugs Kubernetes pod scheduling issues including pods stuck in Pending, node affinity/anti-affinity problems, taints and tolerations, insufficient node resources, and PodDisruptionBudget blocking. Use when pods won't schedule, stuck in Pending, or node placement issues.
allowed-tools: Bash
---

# Debugging Kubernetes Scheduling

Investigates why pods are not being scheduled to nodes.

## Common Scheduling Issues

| Symptom | Likely Cause | First Check |
|---------|-------------|-------------|
| Pending (no nodes available) | Resource shortage | Node capacity |
| Pending (taints) | Missing toleration | Node taints |
| Pending (affinity) | No matching node | Affinity rules |
| Pending (PDB) | Disruption budget | PDB status |
| Unschedulable | Node cordoned | Node status |

## Investigation Workflow

### Step 1: Check Pod Events

```bash
# Describe pod - look at Events section
kubectl describe pod <pod> -n <ns>

# Events will show scheduling failure reason:
# "0/3 nodes are available: 1 Insufficient cpu, 2 node(s) had taint..."
```

### Step 2: Check Node Status

```bash
# List nodes with status
kubectl get nodes

# Node details
kubectl describe node <node>

# Check for cordoned nodes
kubectl get nodes -o custom-columns=NAME:.metadata.name,SCHEDULABLE:.spec.unschedulable
```

### Step 3: Check Node Capacity

```bash
# Resource availability per node
kubectl describe node <node> | grep -A10 "Allocated resources:"

# Quick capacity check
kubectl top nodes
```

### Step 4: Check Taints and Tolerations

```bash
# Node taints
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints

# Detailed taints
kubectl describe node <node> | grep -A5 "Taints:"

# Pod tolerations
kubectl get pod <pod> -n <ns> -o jsonpath='{.spec.tolerations}'
```

## Specific Issues

### Insufficient Resources

```bash
# Check what pod needs
kubectl get pod <pod> -n <ns> -o jsonpath='{.spec.containers[*].resources.requests}'

# Check what nodes have available
kubectl describe nodes | grep -A10 "Allocated resources:"
```

Error: `0/3 nodes are available: 3 Insufficient cpu`

Options:
- Reduce pod resource requests
- Add more nodes
- Free up resources by removing other pods

### Taint/Toleration Mismatch

```bash
# Common taints
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints

# Example: node.kubernetes.io/not-ready:NoSchedule
```

Pods must have matching tolerations to schedule on tainted nodes.

Common taints:
- `node.kubernetes.io/not-ready` - Node not ready
- `node.kubernetes.io/unreachable` - Node unreachable
- `node.kubernetes.io/disk-pressure` - Disk pressure
- `node.kubernetes.io/memory-pressure` - Memory pressure
- Custom taints for dedicated workloads

### Node Affinity/Anti-Affinity

```bash
# Check pod affinity rules
kubectl get pod <pod> -n <ns> -o jsonpath='{.spec.affinity}'

# Check node labels
kubectl get nodes --show-labels

# Check specific label
kubectl get nodes -l <label-key>=<label-value>
```

Error: `0/3 nodes are available: 3 node(s) didn't match Pod's node affinity/selector`

### Pod Anti-Affinity

```bash
# Check podAntiAffinity
kubectl get pod <pod> -n <ns> -o yaml | grep -A20 "podAntiAffinity"
```

Anti-affinity might prevent scheduling if:
- Required anti-affinity and all nodes have conflicting pods
- Topology key limits options

### PodDisruptionBudget Blocking

```bash
# List PDBs
kubectl get pdb -n <ns>

# PDB details
kubectl describe pdb <pdb> -n <ns>

# Check allowed disruptions
kubectl get pdb -n <ns> -o custom-columns=NAME:.metadata.name,MIN-AVAILABLE:.spec.minAvailable,ALLOWED-DISRUPTIONS:.status.disruptionsAllowed
```

If `ALLOWED-DISRUPTIONS: 0`, pods can't be evicted/rescheduled.

### Node Selector Mismatch

```bash
# Pod's nodeSelector
kubectl get pod <pod> -n <ns> -o jsonpath='{.spec.nodeSelector}'

# Find nodes matching selector
kubectl get nodes -l <key>=<value>
```

## Quick Debug Commands

```bash
# All pending pods cluster-wide
kubectl get pods -A --field-selector=status.phase=Pending

# Scheduling events
kubectl get events -A --field-selector reason=FailedScheduling

# Node conditions summary
kubectl get nodes -o custom-columns=NAME:.metadata.name,STATUS:.status.conditions[-1].type,SCHEDULABLE:.spec.unschedulable
```

## Scheduling Decision Flow

1. **Filter nodes**: Remove nodes that don't meet requirements
   - Resource requests
   - NodeSelector
   - Node affinity
   - Taints (without tolerations)
   - Pod anti-affinity

2. **Score nodes**: Rank remaining nodes
   - Resource balance
   - Pod affinity preference
   - Spread constraints

3. **Bind**: Assign pod to highest-scoring node

## Common Scheduling Constraints

| Constraint | Hard/Soft | Effect |
|------------|-----------|--------|
| nodeSelector | Hard | Must match node label |
| requiredDuringScheduling | Hard | Must satisfy affinity |
| preferredDuringScheduling | Soft | Prefer if possible |
| Taint (NoSchedule) | Hard | Must have toleration |
| Taint (PreferNoSchedule) | Soft | Avoid if possible |
| PDB | Hard | Blocks eviction |

## Notes

- Load `debugging-k8s-resources` for resource-related scheduling issues
- Load `analyzing-k8s-events` for scheduling event history
- Pending pods with no events may be waiting for controller
