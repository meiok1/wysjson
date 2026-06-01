import os
import shutil
import sys

repoRoot = r"D:\WysProgrammingTest\wysJSON"
deploy = os.path.join(repoRoot, "部署方式", "网页部署")

required = [
    os.path.join(repoRoot, "indexMonaco.html"),
    os.path.join(repoRoot, "src", "help", "jsonokok.html"),
    os.path.join(repoRoot, "node_modules", "monaco-editor", "min", "vs", "loader.js"),
    os.path.join(repoRoot, "src", "pic", "kaoPuGuiWeChat.jpg"),
    os.path.join(repoRoot, "src", "pic", "zanShangMa.jpg"),
]

missing = [r for r in required if not os.path.exists(r)]
if missing:
    print("Missing required files, aborting deployment:")
    for m in missing:
        print(" - " + m)
    sys.exit(2)

# ensure deploy exists and is empty
if os.path.exists(deploy):
    # remove contents
    for entry in os.listdir(deploy):
        path = os.path.join(deploy, entry)
        try:
            if os.path.isdir(path):
                shutil.rmtree(path)
            else:
                os.remove(path)
        except Exception as e:
            print(f"Warning: failed to remove {path}: {e}")
else:
    os.makedirs(deploy, exist_ok=True)

# copy indexMonaco.html
shutil.copy2(os.path.join(repoRoot, 'indexMonaco.html'), deploy)

# copy monaco min
src_min = os.path.join(repoRoot, 'node_modules', 'monaco-editor', 'min')
dst_monaco_root = os.path.join(deploy, 'node_modules', 'monaco-editor')
os.makedirs(dst_monaco_root, exist_ok=True)

for root, dirs, files in os.walk(src_min):
    rel = os.path.relpath(root, src_min)
    destdir = os.path.join(dst_monaco_root, rel) if rel != '.' else dst_monaco_root
    os.makedirs(destdir, exist_ok=True)
    for f in files:
        shutil.copy2(os.path.join(root, f), os.path.join(destdir, f))

# copy src/help and src/pic
for folder in ['help', 'pic']:
    src_dir = os.path.join(repoRoot, 'src', folder)
    dst_dir = os.path.join(deploy, 'src', folder)
    if os.path.exists(src_dir):
        if os.path.exists(dst_dir):
            shutil.rmtree(dst_dir)
        shutil.copytree(src_dir, dst_dir)

# copy media if exists
src_media = os.path.join(repoRoot, 'media')
if os.path.exists(src_media):
    dst_media = os.path.join(deploy, 'media')
    if os.path.exists(dst_media):
        shutil.rmtree(dst_media)
    shutil.copytree(src_media, dst_media)

# optional files
for f in ['README.md','package.json','package-lock.json','package.nls.json','package.nls.zh-CN.json']:
    sf = os.path.join(repoRoot, f)
    if os.path.exists(sf):
        shutil.copy2(sf, os.path.join(deploy, f))

print('Deployment folder contents:')
for name in sorted(os.listdir(deploy)):
    path = os.path.join(deploy, name)
    if os.path.isdir(path):
        print(name + '/')
    else:
        print(name)

print('Deployment complete')
