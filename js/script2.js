import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const btnFazerPost = document.getElementById("btnFazerPost");
const modalOverlay = document.getElementById("modalOverlay");
const postForm = document.getElementById("postForm");
const feedPosts = document.getElementById("feedPosts");
const closeModalBtn = document.getElementById("closeModalBtn");
const inputSearch = document.getElementById("inputSearch");
const btnLimparBusca = document.getElementById("btnLimparBusca");

// Dados Cloudinary - substitua pelos seus
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dyeh43lpp/upload";
const CLOUDINARY_UPLOAD_PRESET = "fora-da-bolha";

// --- Abrir modal formulário ---
btnFazerPost.addEventListener("click", () => {
  modalOverlay.classList.add("active");
});

// --- Fechar modal e resetar form ---
closeModalBtn.addEventListener("click", () => {
  modalOverlay.classList.remove("active");
  postForm.reset();
});

// --- Função para upload na Cloudinary ---
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(CLOUDINARY_URL, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error("Erro ao enviar imagem para Cloudinary");
  }

  const data = await response.json();
  return data.secure_url; // URL pública da imagem
}

// --- Postar no Firestore com upload Cloudinary ---
postForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const usuario = document.getElementById("usuario").value.trim();
  const categoria = document.getElementById("categoria").value.trim();
  const legenda = document.getElementById("legenda").value.trim();
  const imagemArquivo = document.getElementById("imagemUpload").files[0];
  const imagemURLManual = document.getElementById("imagemURL").value.trim();

  let imagemURLFinal = imagemURLManual;

  // Upload arquivo para Cloudinary se existir
  if (imagemArquivo) {
    try {
      imagemURLFinal = await uploadToCloudinary(imagemArquivo);
    } catch (error) {
      alert("Falha no upload da imagem: " + error.message);
      return;
    }
  }

  if (!usuario || !categoria || !legenda || !imagemURLFinal) {
    alert("Preencha todos os campos e informe uma imagem (upload ou URL).");
    return;
  }

  try {
    await addDoc(collection(db, "posts"), {
      usuario,
      categoria,
      legenda,
      imagemURL: imagemURLFinal,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    alert("Erro ao salvar post: " + error.message);
    return;
  }

  modalOverlay.classList.remove("active");
  postForm.reset();
});

// --- Renderizar posts individualmente ---
function renderPost(post) {
  const timeString = post.timestamp
    ? new Date(post.timestamp.toDate()).toLocaleString()
    : "";

  return `
    <div class="post-card">
      <div class="post-header">
        <div class="post-avatar">${post.usuario.charAt(1)?.toUpperCase() || "?"}</div>
        <div>${post.usuario}</div>
      </div>
      <div class="post-category">em '${post.categoria}'</div>
      <img class="post-image" src="${post.imagemURL}" alt="Imagem do post" />
      <div class="post-caption">${post.legenda}</div>
      <div class="post-timestamp">${timeString}</div>
    </div>
  `;
}

let postsCache = [];

// --- Query para pegar posts em tempo real ordenados por timestamp ---
const queryPosts = query(
  collection(db, "posts"),
  orderBy("timestamp", "desc")
);

// --- Atualiza feed em tempo real ---
onSnapshot(queryPosts, (snapshot) => {
  postsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderFeed(postsCache);
});

// --- Renderiza o feed com filtro de busca ---
function renderFeed(posts) {
  const busca = inputSearch.value.trim().toLowerCase();
  let filteredPosts = posts;

  if (busca) {
    filteredPosts = posts.filter(post =>
      post.usuario.toLowerCase().includes(busca) ||
      post.categoria.toLowerCase().includes(busca) ||
      post.legenda.toLowerCase().includes(busca)
    );
  }

  feedPosts.innerHTML = filteredPosts.map(renderPost).join("");
}

// --- Botão limpar busca ---
btnLimparBusca.addEventListener("click", () => {
  inputSearch.value = "";
  renderFeed(postsCache);
});

// --- Atualiza feed enquanto digita ---
inputSearch.addEventListener("input", () => {
  renderFeed(postsCache);
});
