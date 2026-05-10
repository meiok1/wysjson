# 🚀 wysJSON 扩展 - 你是第一次写 VSCode 插件？这是你的快速指南

## 📌 目前的状态

✅ 代码已全部完成和编译  
✅ 扩展架构已准备好  
✅ 现在需要**测试**验证功能是否正常工作

---

## 🎯 下一步：按照这个流程做

### 步骤 1️⃣：启动调试环境（5 分钟）

```
1. 在主窗口按 Ctrl+Shift+D （打开调试侧栏）
   ↓
2. 选择 "Run Extension (调试扩展)" 或 "Run Extension with Test Data (带测试数据)"
   ↓
3. 按 F5 或点击 ▶ 按钮
   ↓
4. 等待 Extension Development Host 窗口打开（这是测试用的 VSCode 窗口）
```

**这会发生什么？**

- 代码自动编译
- 新的 VS Code 窗口打开（专用于测试你的扩展）
- 你的扩展在这个窗口中激活

---

### 步骤 2️⃣：第一次测试 - 简单 JSON 对象（10 分钟）

在 Extension Development Host（新窗口）中：

```
1. Ctrl+O 打开文件
   ↓
2. 导航到 jsonDemo/testData.js
   ↓
3. 找到 simpleData 对象：
   const simpleData = {
     name: "John Doe",
     age: 30,
     active: true,
     email: "john@example.com"
   };

4. 选中整个对象定义（包括 const 和最后的 ;）
   ↓
5. 右键点击
   ↓
6. 你应该看到菜单项：
   ✓ "wysJSON: 可视化编辑所选 JS 数据"

   如果看不到：
   ❌ 检查文件是否为 .js 或 .ts
   ❌ 检查是否完整选中
   ❌ 查看输出面板错误

7. 点击菜单项
   ↓
8. Webview 应该打开，显示表格：
   | 字段名 | 值 |
   |--------|-----|
   | name | John Doe |
   | age | 30 |
   | active | true |
   | email | john@example.com |
```

**预期结果：**

- ✅ 右键菜单出现
- ✅ Webview 表格显示
- ✅ 可以看到 4 个字段

---

### 步骤 3️⃣：测试编辑和保存（5 分钟）

```
在打开的 Webview 中：

1. 找到 age 字段，点击其值 (30)
   ↓
2. 修改为 31
   ↓
3. 按 Enter 确认编辑
   ↓
4. 查看表格是否更新
   ↓
5. 点击 "💾 保存" 按钮
   ↓
6. 返回原始文件（testData.js）
   ↓
7. 验证 age 是否已更新为 31
```

**预期结果：**

- ✅ 源文件中 age: 30 变成 age: 31
- ✅ 缩进和格式保持不变
- ✅ 其他代码不受影响

---

### 步骤 4️⃣：如果出现问题 - 调试模式（10 分钟）

**问题 1：右键菜单不显示**

在主窗口（不是 DEV Host）做这些：

```
1. 打开 src/extension.ts
2. 在第 40 行（handleOpenSelection 函数开始）点击设置断点（红点）
3. 再次在 DEV Host 中右键点击
4. 你会看到代码暂停在断点处
5. 左边栏查看变量和错误
6. 按 F10 单步执行，观察程序流
```

**问题 2：Webview 不显示表格**

```
1. 在 DEV Host 中打开 DevTools
   Ctrl+Shift+P → "Developer: Open Webview Developer Tools"
2. 查看 Console 标签页（黑窗口）
3. 有红色错误吗？复制错误信息
4. 检查 Sources 标签 → media/webview.js
```

**问题 3：保存后代码没更新**

```
1. 检查是否点击了"保存"按钮（不是关闭）
2. 查看编辑器是否提示文件已改动
3. 在调试控制台输入：
   console.log(genResult)
   查看生成的代码是什么
```

---

### 步骤 5️⃣：尝试更多测试（15 分钟）

在 DEV Host 中，继续测试其他数据：

```javascript
// 测试嵌套数据
nestedData - 应该显示 users 数组和 meta 对象

// 测试包含函数的对象
complexData - 应该显示代码文本（函数、Date、undefined）
            - 这些字段不能编辑，但应该被保留

// 测试数组
simpleArray - 应该显示 5 个值的列表
             - 每个值可以编辑
```

---

## ⚡ 常用快捷键速查

| 做什么                 | 按这个                                   |
| ---------------------- | ---------------------------------------- |
| 启动/重启调试          | F5                                       |
| 停止调试               | Shift+F5                                 |
| 单步执行               | F10                                      |
| 进入函数               | F11                                      |
| 编译代码               | Ctrl+Shift+B                             |
| 打开调试侧栏           | Ctrl+Shift+D                             |
| 打开/关闭终端          | Ctrl+`                                   |
| 打开输出面板           | Ctrl+K Ctrl+O                            |
| 在 DevTools 中查看日志 | Ctrl+Shift+P → "Webview Developer Tools" |

---

## 💡 重要概念解释

### 什么是 Extension Development Host？

= 一个专用的 VS Code 窗口，用于测试你的扩展  
= 你的扩展运行在这个窗口中，不影响主窗口  
= 可以多次启动和重启，进行快速迭代

### 编译和重启的区别

- **修改 TypeScript 代码** → 需要编译（Ctrl+Shift+B）+ 重启 F5
- **修改 Webview HTML/CSS/JS** → 只需刷新（但通常也需要重启）
- **修改 package.json** → 需要完全重启

### 调试器如何工作

1. 代码运行到有断点的行时停止
2. 你可以查看变量值、执行表达式
3. 按 F10 或 F11 逐行执行
4. 按 F5 继续执行直到下一个断点

---

## 🎓 学习 VSCode 扩展的 3 个关键概念

### 1. **消息传递** (Webview ↔ 扩展)

```
Webview 中的代码 ←→ extension.ts 中的代码
          通过 postMessage 互相通信
```

你的代码：

- `webview.js` 使用 `vscode.postMessage()` 发送消息
- `extension.ts` 的 `webview.onDidReceiveMessage()` 接收消息

### 2. **命令注册** (右键菜单)

```
用户右键点击
    ↓
menus.editor/context 配置检查条件
    ↓
触发 command: wysjson.openSelection
    ↓
执行 registerCommand 中的处理函数
```

### 3. **Webview 资源加载**

```
extension.ts 通过 webview.asWebviewUri() 生成安全的 URI
    ↓
在 HTML 中引用 ${cssUri} 和 ${jsUri}
    ↓
Webview 加载和执行这些资源
```

---

## 📊 调试后的行动清单

### ✅ 所有测试通过后

- [ ] 编辑简单 JSON 成功
- [ ] 编辑嵌套数据成功
- [ ] 保存后代码正确更新
- [ ] 代码缩进保持不变
- [ ] 代码文本（函数）被保留

### 🔧 如果有小 bug

1. 找到问题代码的文件
2. 添加 `console.log()` 输出调试信息
3. 重新编译和测试
4. 查看输出面板中的日志
5. 根据日志修复代码

### 🚀 准备发布前

- [ ] 所有测试用例通过
- [ ] 没有 TypeScript 编译错误
- [ ] 没有 console.log 留在代码中
- [ ] README 文档完整
- [ ] package.json 版本号已更新

---

## 🆘 遇到 crash 或卡死？

```
1. 关闭 Extension Development Host 窗口
2. 在主窗口按 Ctrl+Shift+P
3. 输入 "Developer: Kill Extension Host"
4. 等 5 秒
5. 再次按 F5 重启
```

---

## 🎉 现在就开始吧！

**你已经有一个完整、可编译的扩展。现在的任务就是验证它能工作。**

1. 关闭当前显示这个文件的窗口
2. 在项目根目录，打开终端
3. 运行 `npm run compile` - 确保编译成功
4. 按 **F5** - 启动调试
5. 在新窗口中打开 jsonDemo/testData.js
6. 选择对象 → 右键 → 测试你的扩展！

**祝你成功！有问题随时问。** 🚀

---

## 📞 快速问题解答

**Q: 为什么我的右键菜单没有出现？**
A: 可能是：1) 文件不是 .js/.ts，2) 没有选中文本，3) 代码有错误。查看输出面板。

**Q: 我修改了代码，但改动没有反映？**
A: 1) 保存文件（Ctrl+S），2) 编译（Ctrl+Shift+B），3) 重启调试（关闭窗口然后 F5）。

**Q: Webview 崩溃了？**
A: 按 Ctrl+Shift+P 输入 "Reload Window" 重新加载 DEV Host 窗口。

**Q: 如何看到详细的错误日志？**
A: Ctrl+` 打开终端，点击 Output 标签，选择 "wysJSON" channel。

---

**现在就开始你的第一次 VSCode 扩展调试之旅吧！** 🚀
