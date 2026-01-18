---
name: debugging-k8s-rbac
description: Debugs Kubernetes RBAC and permission issues including Forbidden errors, ServiceAccount permissions, Role/RoleBinding, and ClusterRole/ClusterRoleBinding problems. Use when seeing permission denied, forbidden errors, or ServiceAccount access issues.
allowed-tools: Bash
---

# Debugging Kubernetes RBAC

Investigates permission and access control issues.

## Common RBAC Issues

| Symptom | Likely Cause | First Check |
|---------|-------------|-------------|
| Forbidden error | Missing permission | `auth can-i` test |
| ServiceAccount can't access | Missing RoleBinding | Check bindings |
| Cross-namespace access denied | Need ClusterRole | Scope of role |
| API access denied in pod | Wrong ServiceAccount | Pod's SA |

## Investigation Workflow

### Step 1: Test Permissions

```bash
# Can current user do action?
kubectl auth can-i <verb> <resource> -n <ns>

# Can ServiceAccount do action?
kubectl auth can-i <verb> <resource> -n <ns> \
  --as=system:serviceaccount:<namespace>:<serviceaccount>

# List all permissions for ServiceAccount
kubectl auth can-i --list \
  --as=system:serviceaccount:<namespace>:<serviceaccount>
```

Common verbs: `get`, `list`, `watch`, `create`, `update`, `patch`, `delete`

### Step 2: Check Pod's ServiceAccount

```bash
# What ServiceAccount does pod use?
kubectl get pod <pod> -n <ns> -o jsonpath='{.spec.serviceAccountName}'

# ServiceAccount details
kubectl get serviceaccount <sa> -n <ns> -o yaml

# Does ServiceAccount exist?
kubectl get serviceaccount -n <ns>
```

### Step 3: Check RoleBindings

```bash
# RoleBindings in namespace (namespace-scoped permissions)
kubectl get rolebinding -n <ns>

# Details of specific binding
kubectl describe rolebinding <binding> -n <ns>

# ClusterRoleBindings (cluster-wide permissions)
kubectl get clusterrolebinding

# Find bindings for a ServiceAccount
kubectl get rolebinding,clusterrolebinding -A -o json | \
  jq '.items[] | select(.subjects[]?.name=="<serviceaccount>") | .metadata.name'
```

### Step 4: Check Roles

```bash
# Roles in namespace
kubectl get role -n <ns>

# Role details (shows permissions)
kubectl describe role <role> -n <ns>

# ClusterRoles
kubectl get clusterrole

# ClusterRole details
kubectl describe clusterrole <role>
```

## RBAC Components

```
ServiceAccount (identity)
    ↓
RoleBinding/ClusterRoleBinding (connects identity to permissions)
    ↓
Role/ClusterRole (defines permissions)
```

| Component | Scope | Use For |
|-----------|-------|---------|
| Role | Namespace | Namespace-scoped resources |
| ClusterRole | Cluster | Cluster-scoped or cross-namespace |
| RoleBinding | Namespace | Grants Role/ClusterRole in namespace |
| ClusterRoleBinding | Cluster | Grants ClusterRole cluster-wide |

## Specific Issues

### Pod Can't Access Kubernetes API

```bash
# Check pod's ServiceAccount
kubectl get pod <pod> -n <ns> -o jsonpath='{.spec.serviceAccountName}'

# Test what that SA can do
kubectl auth can-i --list --as=system:serviceaccount:<ns>:<sa>

# Check if SA token is mounted
kubectl get pod <pod> -n <ns> -o jsonpath='{.spec.automountServiceAccountToken}'
```

### Forbidden on Specific Resource

```bash
# Test the exact action
kubectl auth can-i get pods -n <ns> --as=system:serviceaccount:<ns>:<sa>

# Find what roles allow this action
kubectl get roles -n <ns> -o json | jq '.items[] | select(.rules[].resources[] | contains("pods"))'
```

### Cross-Namespace Access

For cross-namespace access, need:
- ClusterRole (not Role)
- RoleBinding in each target namespace, OR
- ClusterRoleBinding

```bash
# Check if ClusterRole exists
kubectl get clusterrole <role>

# Check bindings in target namespace
kubectl get rolebinding -n <target-ns>
```

## Quick Permission Check

```bash
# Common checks for a ServiceAccount
SA="system:serviceaccount:<ns>:<sa>"

kubectl auth can-i get pods -n <ns> --as=$SA
kubectl auth can-i list secrets -n <ns> --as=$SA
kubectl auth can-i create deployments -n <ns> --as=$SA
kubectl auth can-i get nodes --as=$SA  # cluster-scoped
```

## Debugging Pattern

```bash
# 1. Identify the denied action from error message
# "forbidden: User "system:serviceaccount:default:myapp" cannot get pods"

# 2. Test the permission
kubectl auth can-i get pods -n default --as=system:serviceaccount:default:myapp

# 3. Check what bindings exist for that SA
kubectl get rolebinding,clusterrolebinding -A -o wide | grep myapp

# 4. Check what permissions those roles grant
kubectl describe role <role> -n <ns>
```

## Notes

- Default ServiceAccount has minimal permissions
- Pods use `default` ServiceAccount unless specified
- ClusterRoleBindings affect all namespaces
- Token automounting can be disabled for security
