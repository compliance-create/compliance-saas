// 生成测试用的 .docx 和 .pdf
const { Document, Packer, Paragraph, HeadingLevel, TextRun } = require('docx');
const fs = require('node:fs');
const path = require('node:path');

const text = `甲方(卖方): 深圳市某科技有限公司, 统一社会信用代码: 91440300MA5DXXXXXX
乙方(买方): 张某某(自然人, 身份证: 4403xxxxxxxxxxxxxx)

甲乙双方就电子设备采购事宜, 达成如下协议:

第一条 标的
甲方向乙方提供笔记本电脑 50 台, 品牌型号 ThinkPad X1 Carbon, 单价人民币 9,800 元, 总计 490,000 元。

第二条 质量
产品符合国家标准, 验收合格后视为质量无异议。

第三条 付款
乙方应于本合同签订之日起 7 个工作日内一次性支付全部货款至甲方对公账户。

第四条 交付
甲方收到货款后 30 日内发货, 运费由甲方承担。

第五条 违约责任
任何一方违约的, 违约方应支付对方合同金额 5% 的违约金。

第六条 争议解决
因本合同发生的争议, 由双方协商解决; 协商不成的, 任一方可向深圳仲裁委员会申请仲裁。

第七条 合同生效
本合同自双方签字之日起生效, 一式两份, 双方各执一份。`;

// 1) 生成 .docx
async function makeDocx() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: text.split('\n').map(
          (line) =>
            new Paragraph({
              heading: line.match(/^第[一二三四五六七八九十]+条/) ? HeadingLevel.HEADING_2 : undefined,
              children: [new TextRun(line)],
            })
        ),
      },
    ],
  });
  const buf = await Packer.toBuffer(doc);
  const out = path.join(__dirname, 'sample-contract.docx');
  fs.writeFileSync(out, buf);
  console.log(`✓ docx: ${out} (${buf.length} bytes)`);
}

// 2) 生成简单的 PDF
async function makePdf() {
  // 直接用最简 PDF 格式手写(避免再装 PDF 库)
  // 这只是测试用,内容是单页纯文本
  const lines = text.split('\n');
  const contentLines = lines.map((l, i) => {
    // PDF text object: BT ... ET, Td = move, Tj = show
    return `(${l.replace(/[()\\]/g, ' ')}) Tj 0 -14 Td`;
  });
  // PDF 1.4 minimal
  const stream = `BT /F1 10 Tf 50 800 Td ${contentLines.join(' ')} ET`;
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 850] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
    `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ];
  const offsets = [0];
  let body = '%PDF-1.4\n';
  for (const o of objects) {
    offsets.push(body.length);
    body += o + '\n';
  }
  const xrefStart = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    body += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  const out = path.join(__dirname, 'sample-contract.pdf');
  fs.writeFileSync(out, body);
  console.log(`✓ pdf: ${out} (${body.length} bytes)`);
}

(async () => {
  await makeDocx();
  await makePdf();
})();
