// small helpers
document.getElementById("year").textContent = new Date().getFullYear();

// gallery modal
document.querySelectorAll(".tile").forEach((tile) => {
  tile.addEventListener("click", () => {
    const img = tile.querySelector("img");
    const modal = document.getElementById("modal");
    const modalImg = document.getElementById("modalImg");
    modalImg.src = img.src;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  });
});
document.getElementById("modal").addEventListener("click", () => {
  document.getElementById("modal").classList.remove("open");
  document.getElementById("modal").setAttribute("aria-hidden", "true");
});

// simple contact form behaviour: prevents reload and shows a tiny toast
document.getElementById("noteForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const name = document.getElementById("name").value || "Someone";
  const message = document.getElementById("message").value || "";
  // here you'd send to your server or to an email API
  alert(
    "Thanks, " +
      name +
      "! Your note was received.\n\nPreview:\n" +
      (message.slice(0, 120) || "[empty message]")
  );
  this.reset();
});

// smooth scrolling for nav links (enhancement for older browsers)
document.querySelectorAll(".links a").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    const id = a.getAttribute("href");
    document.querySelector(id).scrollIntoView({ behavior: "smooth" });
  });
});
