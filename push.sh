#!/bin/bash

# 固定提交信息
COMMIT_MESSAGE="auto: update"
BRANCH_NAME="master"

# 添加并提交
git add .
git commit -m "$COMMIT_MESSAGE"

# 推送到 master 分支
git push https://$GIT_USERNAME:$GIT_PASSWORD@gitea.apivot.fun/ljx/admin.elm-card.site.git "$BRANCH_NAME"

# 确保同步远程标签
git fetch --tags

# 获取远程仓库中最新的 tag（按版本号排序）
LATEST_TAG=$(git ls-remote --tags https://gitea.apivot.fun/ljx/admin.elm-card.site.git | grep -E 'refs/tags/[0-9]+\.[0-9]+' | sed 's/.*refs\/tags\///' | sort -V | tail -n 1)

# 计算新标签
if [[ -z "$LATEST_TAG" ]]; then
    NEW_TAG="0.01"
else
    NEW_TAG=$(printf "%.2f" "$(echo "$LATEST_TAG + 0.01" | bc)")
fi

# 检查远程仓库是否已有该 tag
if git ls-remote --tags https://gitea.apivot.fun/ljx/admin.elm-card.site.git | grep -q "refs/tags/$NEW_TAG"; then
    echo "Tag $NEW_TAG already exists on remote, skipping tag creation."
else
    # 创建并推送新 tag
    git tag "$NEW_TAG"
    git push https://$GIT_USERNAME:$GIT_PASSWORD@gitea.apivot.fun/ljx/admin.elm-card.site.git "$NEW_TAG"
    echo "Pushed to $BRANCH_NAME with tag $NEW_TAG"
fi

