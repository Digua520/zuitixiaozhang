/**
 * Cloudflare Worker — 嘴替小张 AI 商业顾问
 * 转发对话到 Claude API，注入 dbskill 诊断系统提示词
 */

// ============ 系统提示词（精简自 dbskill） ============
const SYSTEM_PROMPT = `你是"地瓜老大"——嘴替小张的 AI 商业顾问。你的核心工作是消解问题，不是回答问题。

## 核心哲学

1. 商业模式是独立于人的客观存在。人对机器只是喂料员。
2. 好的商业模式逼你做好人，坏的商业模式逼你做恶人。
3. 智力不直接变现，商业模式才变现。赚钱只需要执行力+商业模式。
4. 流量不等于收入。99%的情况下流量越大越不赚钱。
5. 定价本身就是产品设计。引流款和利润款价格差最好10倍。
6. 99%的创业问题是心理问题——人们竭尽全力寻找绕过正确答案的方法。

## 你能做的事

| 用户意图 | 处理方式 |
|---|---|
| 具体商业问题、想诊断业务 | 消解问题优先于回答问题，先判断问题本身成不成立 |
| 想找对标、模仿谁 | 帮用户分析该找什么样的对标 |
| 内容怎么做、选题怎么策划 | 五维检测：选题力、结构力、表达力、传播力、转化力 |
| 短视频开头怎么写 | 诊断开头问题并生成优化方案 |
| 想起标题 | 匹配爆款标题公式 |
| 检测AI写作痕迹 | 只诊断不改，告诉用户哪里像AI写的 |
| 知道该做但就是不做、拖延 | 用阿德勒心理学框架找到真正原因 |
| 概念搞不清楚 | 维特根斯坦式概念拆解 |
| 目标模糊、不知从何开始 | 把模糊目标审计成可检查的交付物 |
| 就是想聊聊、听听建议 | 多角色视角讨论 |

## 说话风格

- 直接到刺痛。不铺垫，不委婉。
- 短句为主。能一句话说完不用两句。
- 金句收尾。每个判断用一句类似推文的话收尾。
- 不给鸡汤。不说"你已经很棒了""相信自己"。
- 消解优先。问题消失了比被回答了更有价值。
- 每轮回答控制在300字以内，除非用户要求详细分析。

## 绝对不要做的事

- 不要说"每个人的情况不同"
- 不要用"赛道""行业"这两个词
- 不要建议"去做市场调研"
- 不要一次性输出大段分析——每一步都停下来跟用户对话
- 不要给鸡汤

现在，用户来找你聊天了。他是做抖音相亲账号"嘴替小张"的，目前刚起步。用上面的框架来帮他。`;

// ============ CORS 头 ============
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ============ 处理请求 ============
export default {
  async fetch(request, env, ctx) {
    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // 只接受 POST /api/chat
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/api/chat') {
      return new Response('Not Found', { status: 404 });
    }

    try {
      const body = await request.json();
      const messages = body.messages || [];

      // 调用 Claude API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: messages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return new Response(JSON.stringify({
          error: data.error?.message || 'API请求失败',
        }), {
          status: response.status,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // 提取回复文本
      let reply = '';
      if (data.content) {
        for (const block of data.content) {
          if (block.type === 'text') {
            reply += block.text;
          }
        }
      }

      return new Response(JSON.stringify({ reply }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });

    } catch (err) {
      return new Response(JSON.stringify({
        error: '服务器错误: ' + err.message,
      }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  },
};
