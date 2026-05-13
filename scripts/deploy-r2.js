const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Configuration from environment variables
const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
} = process.env;

// Check if all required environment variables are set
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error("❌ Missing required environment variables. Please check your .env file.");
  console.log("Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME");
  process.exit(1);
}

// Initialize S3 Client for R2
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const SCRAPED_DIR = path.join(__dirname, "../scraped");

const { CreateBucketCommand, HeadBucketCommand } = require("@aws-sdk/client-s3");

async function ensureBucketExists() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: R2_BUCKET_NAME }));
    console.log(`📡 Bucket "${R2_BUCKET_NAME}" already exists.`);
  } catch (err) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      console.log(`🏗️ Creating bucket "${R2_BUCKET_NAME}"...`);
      await s3.send(new CreateBucketCommand({ Bucket: R2_BUCKET_NAME }));
      console.log(`✅ Bucket "${R2_BUCKET_NAME}" created successfully.`);
    } else {
      throw err;
    }
  }
}

async function uploadFile(filePath) {
  const fileName = path.basename(filePath);
  const fileStream = fs.createReadStream(filePath);
  const fileSize = fs.statSync(filePath).size;

  console.log(`⏳ Uploading ${fileName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)...`);

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: fileName,
    Body: fileStream,
    ContentType: "application/json",
  });

  try {
    await s3.send(command);
    console.log(`✅ Successfully uploaded ${fileName}`);
  } catch (err) {
    console.error(`❌ Error uploading ${fileName}:`, err.message);
  }
}

async function deploy() {
  console.log("🚀 Starting deployment to Cloudflare R2...");

  await ensureBucketExists();

  if (!fs.existsSync(SCRAPED_DIR)) {
    console.error(`❌ Directory not found: ${SCRAPED_DIR}`);
    return;
  }

  const files = fs.readdirSync(SCRAPED_DIR).filter(file => file.endsWith(".json"));

  if (files.length === 0) {
    console.log("⚠️ No JSON files found in scraped directory.");
    return;
  }

  console.log(`Found ${files.length} files to upload.`);

  for (const file of files) {
    await uploadFile(path.join(SCRAPED_DIR, file));
  }

  console.log("\n✨ Deployment completed!");
}

deploy().catch(err => {
  console.error("💥 Deployment failed:", err);
  process.exit(1);
});
