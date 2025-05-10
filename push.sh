#!/bin/bash

# 固定提交信息
COMMIT_MESSAGE="auto: update"
BRANCH_NAME="master"

# 添加并提交
git add .
git commit -m "$COMMIT_MESSAGE"

# 推送到 master 分支
git push origin "$BRANCH_NAME"

# 自动生成新的 tag（最新 tag + 0.01）
LATEST_TAG=$(git tag --sort=-v:refname | grep -E '^[0-9]+\.[0-9]+$' | tail -n 1)

if [[ -z "$LATEST_TAG" ]]; then
    NEW_TAG="0.01"
else
    NEW_TAG=$(printf "%.2f" "$(echo "$LATEST_TAG + 0.01" | bc)")
fi

# 创建并推送新 tag
git tag "$NEW_TAG"
git push origin "$NEW_TAG"

echo "Pushed to $BRANCH_NAME with tag $NEW_TAG"
