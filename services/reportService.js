const PDFDocument = require("pdfkit");

function writeList(doc, title, items) {
  doc.moveDown(0.6).fontSize(13).font("Helvetica-Bold").text(title);
  doc.font("Helvetica").fontSize(10);

  if (!items || items.length === 0) {
    doc.text("- No items available.");
    return;
  }

  items.forEach((item) => {
    doc.text(`- ${item}`);
  });
}

function generateInterviewReport(result, user, res) {
  const doc = new PDFDocument({ margin: 48 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=interview-report-${result._id}.pdf`
  );

  doc.pipe(res);

  doc.fontSize(20).font("Helvetica-Bold").text("AI Interview Performance Report");
  doc.moveDown(0.5).fontSize(11).font("Helvetica").text(`Candidate: ${user.name}`);
  doc.text(`Email: ${user.email}`);
  doc.text(`Category: ${result.category}`);
  doc.text(`Role: ${result.role || "General Candidate"}`);
  doc.text(`Difficulty: ${result.difficulty || "Medium"}`);
  doc.text(`Date: ${result.createdAt.toLocaleDateString()}`);
  doc.moveDown(0.6).fontSize(16).font("Helvetica-Bold").text(`Overall Score: ${result.score}%`);

  doc.moveDown().fontSize(13).text("AI Summary");
  doc.fontSize(10).font("Helvetica").text(result.summary || "No summary available.", {
    align: "left"
  });

  result.answers.forEach((item, index) => {
    if (doc.y > 650) {
      doc.addPage();
    }

    doc.moveDown().fontSize(12).font("Helvetica-Bold").text(`${index + 1}. ${item.question}`);
    doc.fontSize(10).font("Helvetica").text(`Answer: ${item.answer || "No answer submitted."}`);
    doc.text(`Score: ${item.score}%`);
    doc.text(`Feedback: ${item.feedback || "No feedback available."}`);
    writeList(doc, "Improvement Tips", item.tips || []);
  });

  doc.end();
}

module.exports = { generateInterviewReport };
