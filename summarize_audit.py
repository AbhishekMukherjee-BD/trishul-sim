import json

with open('scratch_audit_results.json') as f:
    data = json.load(f)

print("=== LOCALHOST ERRORS ===")
print("App Errors:", len(data['localhost']['app']['errors']), data['localhost']['app']['errors'])
print("Portal Errors:", len(data['localhost']['portal']['errors']), data['localhost']['portal']['errors'])

print("\n=== VERCEL ERRORS ===")
print("App Errors:", len(data['vercel']['app']['errors']), data['vercel']['app']['errors'])
print("Portal Errors:", len(data['vercel']['portal']['errors']), data['vercel']['portal']['errors'])

print("\n=== LOCALHOST APP BUTTONS SUMMARY ===")
for b in data['localhost']['app']['buttons']:
    print(f"[{b['status']}] {b['frame']} -> {b['button']}")

print("\n=== VERCEL APP BUTTONS SUMMARY ===")
for b in data['vercel']['app']['buttons']:
    print(f"[{b['status']}] {b['frame']} -> {b['button']}")
