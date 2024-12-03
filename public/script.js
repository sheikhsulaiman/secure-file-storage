const uploadForm = document.getElementById("uploadForm");
const fileInput = document.getElementById("fileInput");
const uploadResult = document.getElementById("uploadResult");

const downloadForm = document.getElementById("downloadForm");
const fileIdInput = document.getElementById("fileId");
const ivInput = document.getElementById("iv");
const downloadResult = document.getElementById("downloadResult");

// Upload & Encrypt File
uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = fileInput.files[0];

  if (!file) {
    uploadResult.textContent = "Please select a file.";
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (response.ok) {
      uploadResult.textContent = `File uploaded successfully! File ID: ${data.fileId}, IV: ${data.iv}`;
    } else {
      uploadResult.textContent = `Error: ${data.message || "Failed to upload"}`;
    }
  } catch (error) {
    uploadResult.textContent = "Error uploading file.";
  }
});

// Download & Decrypt File
downloadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fileId = fileIdInput.value;
  const iv = ivInput.value;

  if (!fileId || !iv) {
    downloadResult.textContent = "Please provide both File ID and IV.";
    return;
  }

  try {
    const response = await fetch(`/download/${fileId}?iv=${iv}`);
    if (response.ok) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `decrypted-file`;
      link.click();
      URL.revokeObjectURL(url);

      downloadResult.textContent = "File downloaded successfully.";
    } else {
      const data = await response.json();
      downloadResult.textContent = `Error: ${
        data.message || "Failed to download"
      }`;
    }
  } catch (error) {
    downloadResult.textContent = "Error downloading file.";
  }
});
