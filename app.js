const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, "hex"); // 32-byte key
const IV_LENGTH = 16; // AES requires a 16-byte IV

// Set up storage for uploaded files
const upload = multer({ dest: "uploads/" });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the frontend files from the "public" directory
app.use(express.static("public"));

// Encryption Function
function encryptFile(inputPath, outputPath) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    iv
  );

  const input = fs.createReadStream(inputPath);
  const output = fs.createWriteStream(outputPath);

  input.pipe(cipher).pipe(output);

  return new Promise((resolve, reject) => {
    output.on("finish", () => resolve(iv.toString("hex")));
    output.on("error", reject);
  });
}

// Decryption Function
function decryptFile(inputPath, outputPath, ivHex) {
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    iv
  );

  const input = fs.createReadStream(inputPath);
  const output = fs.createWriteStream(outputPath);

  input.pipe(decipher).pipe(output);

  return new Promise((resolve, reject) => {
    output.on("finish", resolve);
    output.on("error", reject);
  });
}

// Upload and Encrypt Endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).send({ message: "No file uploaded" });

  const encryptedPath = path.join("uploads", `${file.filename}.enc`);

  try {
    const iv = await encryptFile(file.path, encryptedPath);
    fs.unlinkSync(file.path); // Remove original file
    res.json({
      message: "File encrypted successfully",
      iv,
      fileId: file.filename,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "Error encrypting file" });
  }
});

// Download and Decrypt Endpoint
app.get("/download/:fileId", async (req, res) => {
  const fileId = req.params.fileId;
  const ivHex = req.query.iv; // IV passed as query parameter

  if (!ivHex) return res.status(400).send({ message: "Missing IV" });

  const encryptedPath = path.join("uploads", `${fileId}.enc`);
  const decryptedPath = path.join("uploads", `${fileId}.dec`);

  try {
    await decryptFile(encryptedPath, decryptedPath, ivHex);
    res.download(decryptedPath, (err) => {
      if (!err) fs.unlinkSync(decryptedPath); // Remove decrypted file after download
    });
  } catch (error) {
    res.status(500).send({ message: "Error decrypting file" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
