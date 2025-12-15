const container = document.getElementById("instancesContainer");
const generateBtn = document.getElementById("generate");
const triggerBtn = document.getElementById("triggerPipeline");
const darkToggle = document.getElementById("darkModeToggle");

darkToggle.addEventListener("change", () => {
  document.body.classList.toggle("dark");
});

generateBtn.addEventListener("click", () => {
  container.innerHTML = "";

  const numbers = document.getElementById("instanceNumbers").value.split(",");
  const names = document.getElementById("instanceNames").value.split(",");

  if (numbers.length !== names.length) {
    alert("Instance numbers and names count must match");
    return;
  }

  numbers.forEach((num, index) => {
    const card = document.createElement("div");
    card.className = "instance-card";

    card.innerHTML = `
      <h3>Instance ${num.trim()} (${names[index].trim()})</h3>

      <label>
        <input type="checkbox" class="runner"> Runner Required
      </label><br>

      <label>
        <input type="checkbox" class="bucket"> Bucket Required
      </label>
      <input type="text" class="bucket-name" placeholder="Bucket Name"><br>

      <label>
        <input type="checkbox" class="eip"> Elastic IP Required
      </label>
    `;

    container.appendChild(card);
  });
});

triggerBtn.addEventListener("click", async () => {
  const instances = [];

  document.querySelectorAll(".instance-card").forEach(card => {
    instances.push({
      runner: card.querySelector(".runner").checked,
      bucketRequired: card.querySelector(".bucket").checked,
      bucketName: card.querySelector(".bucket-name").value,
      elasticIp: card.querySelector(".eip").checked
    });
  });

  try {
    const res = await fetch("https://YOUR_API_ENDPOINT_HERE", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instances })
    });

    if (!res.ok) throw new Error("Pipeline trigger failed");

    alert("Pipeline triggered successfully");
  } catch (err) {
    alert(err.message);
  }
});
