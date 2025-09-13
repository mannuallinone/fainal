document.addEventListener("DOMContentLoaded", () => {
  const images = document.querySelectorAll(".gallery-grid img");

  // Modal create
  const modal = document.createElement("div");
  modal.id = "imgModal";
  modal.style.display = "none";
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100%";
  modal.style.height = "100%";
  modal.style.backgroundColor = "rgba(65, 56, 56, 0.8)";
  modal.style.justifyContent = "center";
  modal.style.alignItems = "center";
  modal.style.zIndex = "9999";

  const modalImg = document.createElement("img");
  modalImg.style.maxWidth = "90%";
  modalImg.style.maxHeight = "90%";
  modalImg.style.borderRadius = "12px";
  modal.appendChild(modalImg);

  // Modal close on click
  modal.addEventListener("click", () => {
    modal.style.display = "none";
  });

  document.body.appendChild(modal);

  // Add click event to each image
  images.forEach(img => {
    img.addEventListener("click", () => {
      modalImg.src = img.src;
      modal.style.display = "flex";
    });
  });
});