// 用 pdfkit 生成一个真实的 PDF 测试样本
const PDFDocument = require('pdfkit');
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

const doc = new PDFDocument({ size: 'A4', margin: 50 });
const out = path.join(__dirname, 'sample-contract-real.pdf');
const stream = fs.createWriteStream(out);
doc.pipe(stream);

doc.font('Helvetica');
doc.fontSize(12);
const lines = text.split('\n');
for (const line of lines) {
  if (line.match(/^第[一二三四五六七八九十]+条/)) {
    doc.moveDown(0.5).fontSize(14).text(line).fontSize(12);
  } else if (line.trim() === '') {
    doc.moveDown(0.5);
  } else {
    doc.text(line);
  }
}
doc.end();

stream.on('finish', () => {
  const size = fs.statSync(out).size;
  console.log(`PDF generated: ${out} (${size} bytes)`);
});
