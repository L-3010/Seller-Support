 const contactForm = document.getElementById("contactForm");

  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("userName").value;
    const email = document.getElementById("userEmail").value;
    const message = document.getElementById("userMessage").value;

    const res = await fetch("http://localhost:5000/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, message }),
    });

    if (res.ok) {
      alert("✅ Your message has been sent!");
      contactForm.reset();
    } else {
      alert("❌ Failed to send. Please try again.");
    }
  });
