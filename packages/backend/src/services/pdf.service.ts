import fs from "fs/promises";
import path from "path";
import PDFDocument from "pdfkit";
import {
  APP_NAME,
  formatCurrency,
  formatSignedCurrency,
  formatSignedPoints,
  REPORT_DISCLAIMER
} from "@e-patti/shared";
import { config } from "../config";
import { getPaths } from "../storage/fileStore";
import { getSummary } from "./game.service";

const FOREST = "#0B3D2E";
const GOLD = "#C9A227";
const CREAM = "#F5F0E6";
const INK = "#1F2933";
const MUTED = "#52606D";
const LINE = "#D9CDB8";
const ROW_ALT = "#F8F4EA";
const POSITIVE = "#0F7B4A";
const NEGATIVE = "#B42318";

interface TableColumn {
  key: string;
  label: string;
  width: number;
  align?: "left" | "right" | "center";
}

function drawPageChrome(doc: PDFKit.PDFDocument, roomId: string) {
  const width = doc.page.width;
  const height = doc.page.height;
  doc.save();
  doc.rect(0, 0, width, 46).fill(FOREST);
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(14).text(APP_NAME, 36, 16, { continued: false });
  doc.fillColor(CREAM).font("Helvetica").fontSize(9).text(`Room ${roomId}`, 0, 18, {
    align: "right",
    width: width - 36
  });
  doc.rect(0, height - 32, width, 32).fill(FOREST);
  doc.restore();
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number, roomId: string) {
  const bottom = doc.page.height - 48;
  if (doc.y + needed > bottom) {
    doc.addPage();
    drawPageChrome(doc, roomId);
    doc.y = 60;
    return true;
  }
  return false;
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string, roomId: string) {
  ensureSpace(doc, 36, roomId);
  doc.moveDown(0.4);
  doc.fillColor(FOREST).font("Helvetica-Bold").fontSize(13).text(title, 36, doc.y);
  doc.moveTo(36, doc.y + 4).lineTo(doc.page.width - 36, doc.y + 4).strokeColor(GOLD).lineWidth(1.5).stroke();
  doc.moveDown(0.8);
}

function drawTable(
  doc: PDFKit.PDFDocument,
  columns: TableColumn[],
  rows: Array<Record<string, string>>,
  roomId: string,
  options?: { highlightLast?: boolean }
) {
  const startX = 36;
  const rowHeight = 18;
  const headerHeight = 22;
  const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);

  const drawHeader = () => {
    ensureSpace(doc, headerHeight + 8, roomId);
    let x = startX;
    doc.save();
    doc.rect(startX, doc.y, tableWidth, headerHeight).fill(FOREST);
    doc.fillColor(CREAM).font("Helvetica-Bold").fontSize(8);
    const headerY = doc.y;
    for (const column of columns) {
      doc.text(column.label, x + 4, headerY + 6, {
        width: column.width - 8,
        align: column.align ?? "left"
      });
      x += column.width;
    }
    doc.restore();
    doc.y = headerY + headerHeight;
  };

  drawHeader();

  rows.forEach((row, index) => {
    const wrapped = ensureSpace(doc, rowHeight + 2, roomId);
    if (wrapped) drawHeader();
    const isLast = Boolean(options?.highlightLast && index === rows.length - 1);
    const bg = isLast ? "#E8D9A8" : index % 2 === 0 ? CREAM : ROW_ALT;
    doc.save();
    doc.rect(startX, doc.y, tableWidth, rowHeight).fill(bg);
    doc.lineWidth(0.4).strokeColor(LINE).rect(startX, doc.y, tableWidth, rowHeight).stroke();
    doc.restore();

    let x = startX;
    const rowY = doc.y;
    doc.font(isLast ? "Helvetica-Bold" : "Helvetica").fontSize(8);
    for (const column of columns) {
      const raw = row[column.key] ?? "";
      const isNeg = raw.startsWith("-") || raw.startsWith("−");
      const isPos = raw.startsWith("+");
      doc.fillColor(isNeg ? NEGATIVE : isPos ? POSITIVE : INK);
      doc.text(raw, x + 4, rowY + 5, {
        width: column.width - 8,
        align: column.align ?? "left",
        lineBreak: false
      });
      x += column.width;
    }
    doc.y = rowY + rowHeight;
  });
  doc.moveDown(0.6);
}

export async function generateGamePdf(userId: string, gameId: string): Promise<{ buffer: Buffer; filename: string }> {
  const summary = await getSummary(userId, gameId);
  const game = summary.game;
  const rate = game.scoringConfig.pointsToMoneyRate;
  const unit = summary.settlement.unit;

  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    bufferPages: true,
    margins: { top: 56, bottom: 40, left: 36, right: 36 },
    info: {
      Title: `${APP_NAME} Game Summary — ${game.roomId}`,
      Author: APP_NAME
    }
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  drawPageChrome(doc, game.roomId);
  doc.y = 64;
  doc.fillColor(FOREST).font("Helvetica-Bold").fontSize(22).text("Game Summary Report", 36, doc.y);
  doc.fillColor(MUTED).font("Helvetica").fontSize(10).text("Complete round history, standings, and settlement", 36, doc.y + 4);
  doc.moveDown(1.2);

  drawSectionTitle(doc, "Section 1: Game Information", game.roomId);
  const info = [
    ["Application", APP_NAME],
    ["Room ID", game.roomId],
    ["Game name", game.name || "—"],
    ["Status", game.status],
    ["Started", new Date(game.createdAt).toLocaleString("en-IN")],
    ["Completed", game.completedAt ? new Date(game.completedAt).toLocaleString("en-IN") : "In progress"],
    ["Players", String(game.players.length)],
    ["Rounds played", String(game.rounds.length)],
    ["Scoring rule", game.scoringConfig.rule],
    ["Points-to-money rate", rate ? `1 point = ₹${rate}` : "Not configured (settlement in points)"]
  ];
  info.forEach(([label, value]) => {
    ensureSpace(doc, 16, game.roomId);
    const y = doc.y;
    doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(9).text(label, 36, y, { width: 180 });
    doc.fillColor(INK).font("Helvetica").text(value, 220, y, { width: 500 });
    doc.y = y + 14;
  });

  drawSectionTitle(doc, "Section 2: Player Details", game.roomId);
  drawTable(
    doc,
    [
      { key: "number", label: "Player no.", width: 90, align: "center" },
      { key: "name", label: "Player name", width: 240 }
    ],
    game.players.map((player, index) => ({ number: String(index + 1), name: player.name })),
    game.roomId
  );

  const usableWidth = doc.page.width - 72;
  drawSectionTitle(doc, "Section 3: Round-by-round points", game.roomId);
  if (game.rounds.length === 0) {
    doc.fillColor(INK).font("Helvetica").fontSize(10).text("No rounds recorded yet.");
    doc.moveDown(0.8);
  } else {
    for (const round of game.rounds) {
      ensureSpace(doc, 92, game.roomId);
      doc
        .fillColor(FOREST)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(`Round ${round.roundNumber}  ·  Winner: ${round.winnerName ?? "—"}`, 36, doc.y);
      doc.moveDown(0.25);
      const orderedScores = game.players.map((player) => {
        const score = round.playerScores.find((item) => item.playerId === player.id);
        return {
          player: player.name,
          result: player.id === round.winnerId ? "Winner" : "Packed",
          points: formatSignedPoints(score?.points ?? 0)
        };
      });
      drawTable(
        doc,
        [
          { key: "player", label: "Player", width: 260 },
          { key: "result", label: "Result", width: 140 },
          { key: "points", label: "Points", width: 140, align: "right" }
        ],
        orderedScores,
        game.roomId
      );
    }

    drawSectionTitle(doc, "All rounds overview", game.roomId);
    const winnerWidth = 90;
    const roundWidth = 54;
    const remaining = usableWidth - winnerWidth - roundWidth;
    const playerWidth = Math.max(64, remaining / Math.max(1, game.players.length));
    const roundCols: TableColumn[] = [
      { key: "round", label: "Round", width: roundWidth, align: "center" },
      ...game.players.map((player) => ({
        key: player.id,
        label: player.name,
        width: playerWidth,
        align: "right" as const
      })),
      { key: "winner", label: "Winner", width: winnerWidth }
    ];

    const roundRows = game.rounds.map((round) => {
      const row: Record<string, string> = {
        round: String(round.roundNumber),
        winner: round.winnerName ?? ""
      };
      for (const score of round.playerScores) {
        row[score.playerId] = formatSignedPoints(score.points);
      }
      return row;
    });
    const totalRow: Record<string, string> = { round: "Total", winner: "—" };
    for (const standing of summary.leaderboard.standings) {
      totalRow[standing.playerId] = formatSignedPoints(standing.netPoints);
    }
    roundRows.push(totalRow);
    drawTable(doc, roundCols, roundRows, game.roomId, { highlightLast: true });
  }

  drawSectionTitle(doc, "Section 4: Player-Wise Totals", game.roomId);
  drawTable(
    doc,
    [
      { key: "rank", label: "Rank", width: 50, align: "center" },
      { key: "player", label: "Player", width: 140 },
      { key: "won", label: "Total won", width: 110, align: "right" },
      { key: "lost", label: "Total lost", width: 110, align: "right" },
      { key: "net", label: "Net points", width: 110, align: "right" },
      { key: "balance", label: "Money / points", width: 140, align: "right" }
    ],
    summary.leaderboard.standings.map((player) => ({
      rank: String(player.rank),
      player: player.playerName,
      won: player.pointsWon.toLocaleString("en-IN"),
      lost: player.pointsLost.toLocaleString("en-IN"),
      net: formatSignedPoints(player.netPoints),
      balance: formatSignedCurrency(player.moneyBalance ?? 0, unit)
    })),
    game.roomId
  );

  drawSectionTitle(doc, "Section 5: Final Settlement Table", game.roomId);
  doc.fillColor(MUTED).font("Helvetica-Oblique").fontSize(8).text(summary.settlement.disclaimer, 36, doc.y, {
    width: usableWidth
  });
  doc.moveDown(0.6);

  if (summary.settlement.transfers.length === 0) {
    doc.fillColor(INK).font("Helvetica").fontSize(10).text("All balances are already settled. No transfers are required.");
    doc.moveDown(0.8);
  } else {
    drawTable(
      doc,
      [
        { key: "payer", label: "Payer", width: 170 },
        { key: "receiver", label: "Receiver", width: 170 },
        { key: "amount", label: "Amount to pay", width: 150, align: "right" }
      ],
      [
        ...summary.settlement.transfers.map((transfer) => ({
          payer: transfer.payerName,
          receiver: transfer.receiverName,
          amount: formatCurrency(transfer.amount, transfer.unit)
        })),
        {
          payer: "Total payable",
          receiver: "Total receivable",
          amount: formatCurrency(summary.settlement.totalPayable, unit)
        }
      ],
      game.roomId,
      { highlightLast: true }
    );
  }

  if (summary.settlement.payerTotals.length > 0 || summary.settlement.receiverTotals.length > 0) {
    drawTable(
      doc,
      [
        { key: "player", label: "Player", width: 200 },
        { key: "payable", label: "Total payable", width: 160, align: "right" },
        { key: "receivable", label: "Total receivable", width: 160, align: "right" }
      ],
      game.players.map((player) => {
        const payable = summary.settlement.payerTotals.find((item) => item.playerId === player.id)?.amount ?? 0;
        const receivable = summary.settlement.receiverTotals.find((item) => item.playerId === player.id)?.amount ?? 0;
        return {
          player: player.name,
          payable: payable ? formatCurrency(payable, unit) : "—",
          receivable: receivable ? formatCurrency(receivable, unit) : "—"
        };
      }),
      game.roomId
    );
  }

  drawSectionTitle(doc, "Section 6: Final Totals and Validation", game.roomId);
  const validationRows = [
    ["Total rounds", String(summary.validation.totalRounds)],
    ["Total points won", summary.validation.totalPointsWon.toLocaleString("en-IN")],
    ["Total points lost", summary.validation.totalPointsLost.toLocaleString("en-IN")],
    ["Net balance of all players", formatSignedPoints(summary.validation.netBalance)],
    ["Total settlement amount", formatCurrency(summary.validation.totalSettlementAmount, unit)],
    ["Balances reconcile", summary.validation.reconciles ? "Yes — totals match" : "No — review round data"]
  ];
  validationRows.forEach(([label, value]) => {
    ensureSpace(doc, 16, game.roomId);
    const y = doc.y;
    doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(9).text(label, 36, y, { width: 240 });
    doc.fillColor(INK).font("Helvetica").text(value, 280, y, { width: 400 });
    doc.y = y + 14;
  });

  const range = doc.bufferedPageRange();
  const generated = new Date().toLocaleString("en-IN");
  for (let i = 0; i < range.count; i += 1) {
    doc.switchToPage(range.start + i);
    doc.fillColor(CREAM)
      .font("Helvetica")
      .fontSize(8)
      .text(
        `${REPORT_DISCLAIMER}   ·   Generated ${generated}   ·   Page ${i + 1} of ${range.count}`,
        36,
        doc.page.height - 22,
        { width: doc.page.width - 72, align: "center" }
      );
  }

  doc.end();
  const buffer = await done;
  const filename = `E-Patti-Room-${game.roomId}-Summary.pdf`;
  const pdfPath = path.join(getPaths().pdfDir, filename);
  await fs.mkdir(path.dirname(pdfPath), { recursive: true });
  await fs.writeFile(pdfPath, buffer);
  await cleanupOldPdfs();
  return { buffer, filename };
}

async function cleanupOldPdfs(): Promise<void> {
  const { pdfDir } = getPaths();
  const maxAgeMs = config.pdfRetentionHours * 60 * 60 * 1000;
  try {
    const names = await fs.readdir(pdfDir);
    const now = Date.now();
    await Promise.all(
      names.map(async (name) => {
        const filePath = path.join(pdfDir, name);
        const stat = await fs.stat(filePath);
        if (now - stat.mtimeMs > maxAgeMs) {
          await fs.unlink(filePath).catch(() => undefined);
        }
      })
    );
  } catch {
    // generated directory may not exist yet
  }
}
