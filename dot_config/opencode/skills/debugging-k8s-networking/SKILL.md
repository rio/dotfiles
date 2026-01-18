---
name: debugging-k8s-networking
description: Debugs Kubernetes networking issues including Service connectivity, DNS resolution, Ingress routing, Endpoints, and NetworkPolicy. Use when services are unreachable, DNS fails, ingress not routing, or network connectivity problems.
allowed-tools: Bash
---

# Debugging Kubernetes Networking

Investigates Service, DNS, Ingress, and connectivity issues.

## Common Network Issues

| Symptom | Likely Cause | First Check |
|---------|-------------|-------------|
| Service unreachable | No endpoints, selector mismatch | Endpoints exist |
| DNS not resolving | CoreDNS issue, wrong service name | DNS from inside pod |
| Ingress not routing | Missing backend, TLS issue | Ingress + Service config |
| Connection refused | Pod not listening, wrong port | Target port matches |
| Connection timeout | NetworkPolicy blocking | NetworkPolicy rules |

## Investigation Workflow

### Step 1: Verify Service and Endpoints

```bash
# Check service exists
kubectl get svc <service> -n <ns>

# Check endpoints (should list pod IPs)
kubectl get endpoints <service> -n <ns>

# Detailed service info
kubectl describe svc <service> -n <ns>
```

**No endpoints?** Check:
- Service selector matches pod labels
- Pods are Running and Ready

```bash
# Compare service selector with pod labels
kubectl get svc <service> -n <ns> -o jsonpath='{.spec.selector}'
kubectl get pods -n <ns> --show-labels
```

### Step 2: Test DNS Resolution

```bash
# From inside a pod (use any running pod)
kubectl exec -it <pod> -n <ns> -- nslookup <service>
kubectl exec -it <pod> -n <ns> -- nslookup <service>.<namespace>.svc.cluster.local

# Check CoreDNS is running
kubectl get pods -n kube-system -l k8s-app=kube-dns
```

DNS format: `<service>.<namespace>.svc.cluster.local`

### Step 3: Test Connectivity

```bash
# From inside a pod, test connection
kubectl exec -it <pod> -n <ns> -- wget -qO- --timeout=5 http://<service>:<port>/
kubectl exec -it <pod> -n <ns> -- nc -zv <service> <port>

# Or using curl if available
kubectl exec -it <pod> -n <ns> -- curl -s --max-time 5 http://<service>:<port>/
```

### Step 4: Check NetworkPolicy

```bash
# List NetworkPolicies
kubectl get networkpolicy -n <ns>

# Check policy details
kubectl describe networkpolicy <policy> -n <ns>
```

NetworkPolicy can block:
- Ingress (incoming to pod)
- Egress (outgoing from pod)

## Specific Issues

### Service Has No Endpoints

```bash
# Check if pods match selector
kubectl get svc <service> -n <ns> -o jsonpath='{.spec.selector}'

# Find pods with those labels
kubectl get pods -n <ns> -l <key>=<value>

# Check if pods are Ready
kubectl get pods -n <ns> -o wide
```

### Ingress Not Working

```bash
# Check ingress config
kubectl get ingress -n <ns>
kubectl describe ingress <ingress> -n <ns>

# Check ingress controller logs
kubectl logs -n <ingress-ns> -l app.kubernetes.io/name=ingress-nginx --tail=50
```

Common ingress issues:
- Backend service doesn't exist
- Service port mismatch
- TLS secret missing
- Ingress class not specified

```bash
# Check ingress class
kubectl get ingressclass
```

### Port Mismatch

```bash
# Service targetPort must match container port
kubectl get svc <service> -n <ns> -o jsonpath='{.spec.ports[*].targetPort}'
kubectl get pod <pod> -n <ns> -o jsonpath='{.spec.containers[*].ports[*].containerPort}'
```

### Pod Not Listening

```bash
# Check what ports the container exposes
kubectl get pod <pod> -n <ns> -o jsonpath='{.spec.containers[*].ports}'

# Check if process is listening inside pod
kubectl exec -it <pod> -n <ns> -- netstat -tlnp 2>/dev/null || kubectl exec -it <pod> -n <ns> -- ss -tlnp
```

## Quick Debug Commands

```bash
# Full service + endpoints overview
kubectl get svc,ep -n <ns>

# Check all ingresses
kubectl get ingress -A

# DNS debugging pod (if needed)
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup <service>.<ns>.svc.cluster.local
```

## Notes

- Load `analyzing-k8s-events` to check for network-related events
- Load `debugging-k8s-pods` if the target pods are not healthy
