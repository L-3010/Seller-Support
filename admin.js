// admin.js

// ==== وظائف إدارة التعليقات في لوحة المسؤول ====
const API_URL_COMMENTS = "http://seller-support-production.up.railway.app/comments";
const API_URL_RATINGS = "http://seller-support-production.up.railway.app/ratings";

// دالة لجلب وعرض التعليقات في لوحة المسؤول
async function loadCommentsAdmin(commentsContainer) {
    if (!commentsContainer) return;

    try {
        const res = await fetch(API_URL_COMMENTS);
        if (!res.ok) throw new Error('Failed to fetch comments for admin.');
        const comments = await res.json();

        commentsContainer.innerHTML = "";

        if (comments.length === 0) {
            commentsContainer.innerHTML = '<p>No comments submitted yet.</p>';
            return;
        }

        comments.forEach((comment) => {
            const card = document.createElement("div");
            card.className = "comment-card";
            card.innerHTML = `
                <div class="comment-content">
                    <p><strong>${comment.name || 'Anonymous'}</strong> <small>(Page: ${comment.pageId || 'N/A'})</small></p>
                    <p>${comment.message}</p>
                    <small>${new Date(comment.createdAt).toLocaleString()}</small>
                </div>
                <div class="reply-section">
                    ${comment.reply ? `
                        <div class="reply">
                            <strong>Your Reply:</strong>
                            <p>${comment.reply.message}</p>
                            <small>${new Date(comment.reply.repliedAt).toLocaleString()}</small>
                        </div>
                    ` : `
                        <textarea placeholder="Write your reply..." rows="3"></textarea>
                        <button onclick="submitReply('${comment._id}', this)">Send Reply</button>
                    `}
                </div>
                <button class="delete-btn" onclick="deleteComment('${comment._id}', this)">
                    Delete Comment
                </button>
            `;
            commentsContainer.appendChild(card);
        });
    } catch (error) {
        console.error("Error loading admin comments:", error);
        commentsContainer.innerHTML = '<p style="color:red;">Error loading comments.</p>';
    }
}

// دالة لإرسال الرد على تعليق
async function submitReply(commentId, btn) {
    const textarea = btn.previousElementSibling;
    const message = textarea.value.trim();
    if (!message) return alert("Reply can't be empty");

    btn.disabled = true;
    btn.innerText = "Sending...";

    try {
        const response = await fetch(`${API_URL_COMMENTS}/${commentId}/reply`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, adminName: "Admin" }),
        });

        if (response.ok) {
            window.location.reload();
        } else {
            const errorData = await response.json();
            alert(errorData.message || "Failed to send reply");
        }
    } catch (error) {
        console.error("Error sending reply:", error);
        alert("An error occurred while sending reply.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Send Reply";
    }
}

// دالة لحذف تعليق
async function deleteComment(id, button) {
    const confirmed = confirm("Are you sure you want to delete this comment?");
    if (!confirmed) return;

    try {
        const res = await fetch(`${API_URL_COMMENTS}/${id}`, {
            method: "DELETE",
        });

        if (res.ok) {
            button.parentElement.remove();
            alert("Comment deleted successfully!");
        } else {
            const errorData = await res.json();
            alert(errorData.message || "Failed to delete comment");
        }
    } catch (error) {
        console.error("Error deleting comment:", error);
        alert("An error occurred while deleting comment.");
    }
}

// دالة لجلب وعرض جميع التقييمات في لوحة المسؤول
async function loadAdminRatings(ratingsList) {
    if (!ratingsList) return;

    try {
        const res = await fetch(API_URL_RATINGS);
        if (!res.ok) throw new Error('Failed to fetch ratings for admin.');
        const ratingsData = await res.json();

        ratingsList.innerHTML = '';

        if (ratingsData.length === 0) {
            ratingsList.innerHTML = '<p>No ratings submitted yet.</p>';
            return;
        }

        ratingsData.forEach(r => {
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>${r.name || 'Anonymous'}</strong>: ${r.rating} stars <small>(Page: ${r.pageId || 'N/A'})</small>
                <small>(${new Date(r.createdAt).toLocaleDateString()})</small>
            `;
            ratingsList.appendChild(li);
        });
    } catch (error) {
        console.error("Error loading admin ratings:", error);
        ratingsList.innerHTML = '<p style="color:red;">Error loading ratings.</p>';
    }
}


// ==== الكود الخاص بتقييمات وتعليقات المستخدم في الصفحات العامة (مثل index.html) ====

// دالة لجلب pageId الحالي من وسم meta
function getPageId() {
    const metaTag = document.querySelector('meta[name="page-id"]');
    return metaTag ? metaTag.content : 'unknown_page';
}

// دالة واحدة لمعالجة إرسال أي فورم
function handleFormSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const formId = form.id;

    const formData = {
        name: form.querySelector('[name="name"]').value,
        email: form.querySelector('[name="email"]').value,
        message: form.querySelector('[name="message"]') ? form.querySelector('[name="message"]').value : form.querySelector('[name="subject"]').value,
        subject: form.querySelector('[name="subject"]') ? form.querySelector('[name="subject"]').value : 'Contact Message'
    };

    fetch('/contact', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        const messageDiv = document.getElementById(formId.replace('Form', 'FormMessage'));
        if (messageDiv) {
            if (data.success) {
                messageDiv.innerHTML = '<p style="color: green;">Message sent successfully!</p>';
                form.reset();
            } else {
                messageDiv.innerHTML = '<p style="color: red;">Failed to send message.</p>';
            }
        }
    })
    .catch((error) => {
        console.error('Error:', error);
        const messageDiv = document.getElementById(formId.replace('Form', 'FormMessage'));
        if (messageDiv) {
            messageDiv.innerHTML = '<p style="color: red;">An error occurred while sending the message.</p>';
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    // تعريف عناصر لوحة تحكم المسؤول داخل DOMContentLoaded
    const commentsContainerAdmin = document.getElementById("comments-container");
    const adminRatingsList = document.getElementById("adminRatingsList");
    const resetButton = document.getElementById("resetRatingsButton");
    const adminRatingStatus = document.getElementById("adminRatingStatus");


    // عناصر واستمعات لنموذج التقييم (النجوم فقط)
    const userRatingStars = document.getElementById("userRatingStars");
    const userRatingForm = document.getElementById("userRatingForm");
    const overallAverageRating = document.getElementById("overallAverageRating");
    const totalRatingsCount = document.getElementById("totalRatingsCount");
    let currentRating = 0;

    if (userRatingStars) {
        const stars = userRatingStars.querySelectorAll("span");

        stars.forEach((star) => {
            star.addEventListener("click", () => {
                currentRating = parseInt(star.dataset.value);
                stars.forEach((s) => s.classList.remove("active"));
                for (let i = 0; i < currentRating; i++) {
                    stars[i].classList.add("active");
                }
            });

            star.addEventListener("mouseover", () => {
                stars.forEach((s) => s.classList.remove("active"));
                const hoverValue = parseInt(star.dataset.value);
                for (let i = 0; i < hoverValue; i++) {
                    stars[i].classList.add("active");
                }
            });

            star.addEventListener("mouseout", () => {
                stars.forEach((s) => s.classList.remove("active"));
                for (let i = 0; i < currentRating; i++) {
                    stars[i].classList.add("active");
                }
            });
        });
    }

    if (userRatingForm) {
        userRatingForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const raterName = document.getElementById("raterName").value.trim();
            const userRatingStatus = document.getElementById("userRatingStatus");
            const pageId = getPageId();

            if (currentRating === 0) {
                userRatingStatus.textContent = "Please select a rating.";
                userRatingStatus.style.color = "red";
                return;
            }
            if (!raterName) {
                userRatingStatus.textContent = "Please enter your name.";
                userRatingStatus.style.color = "red";
                return;
            }

            try {
                const response = await fetch("http://seller-support-backend-production.up.railway.app/ratings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: raterName, rating: currentRating, pageId: pageId }),
                });

                if (response.ok) {
                    userRatingStatus.textContent = "Rating submitted successfully!";
                    userRatingStatus.style.color = "green";
                    userRatingForm.reset();
                    currentRating = 0;
                    if (userRatingStars) {
                        userRatingStars.querySelectorAll("span").forEach(s => s.classList.remove("active"));
                    }
                    loadOverallRating();
                } else {
                    const errorData = await response.json();
                    userRatingStatus.textContent = errorData.message || "Failed to submit rating. Please try again.";
                    userRatingStatus.style.color = "red";
                }
            } catch (error) {
                console.error("Error submitting rating:", error);
                userRatingStatus.textContent = "An error occurred. Please try again later.";
                userRatingStatus.style.color = "red";
            }
        });
    }

    // وظيفة لتحميل وعرض متوسط التقييم العام
    async function loadOverallRating() {
        const pageId = getPageId();
        try {
            const res = await fetch(`http://seller-support-production.up.railway.app/ratings/average?pageId=${pageId}`);
            if (!res.ok) throw new Error('Failed to fetch average rating');
            const data = await res.json();

            if (overallAverageRating && totalRatingsCount) {
                overallAverageRating.textContent = data.average ? data.average.toFixed(1) : 'N/A';
                totalRatingsCount.textContent = data.count || 0;
            }
        } catch (error) {
            console.error("Error loading overall rating:", error);
            if (overallAverageRating) overallAverageRating.textContent = 'Error';
            if (totalRatingsCount) totalRatingsCount.textContent = '0';
        }
    }

    // عناصر واستمعات لنموذج التعليقات (للمراسلة النصية فقط)
    const userCommentForm = document.getElementById("userCommentForm");
    const publicCommentsContainer = document.getElementById("public-comments-container");

    if (userCommentForm) {
        userCommentForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const userName = document.getElementById("userName").value.trim();
            const userMessage = document.getElementById("userMessage").value.trim();
            const userCommentStatus = document.getElementById("userCommentStatus");
            const pageId = getPageId();

            if (!userName || !userMessage) {
                userCommentStatus.textContent = "Please fill in all fields.";
                userCommentStatus.style.color = "red";
                return;
            }

            try {
                const response = await fetch("http://seller-support-production.up.railway.app/comments", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: userName, message: userMessage, pageId: pageId }),
                });

                if (response.ok) {
                    userCommentStatus.textContent = "Comment submitted successfully!";
                    userCommentStatus.style.color = "green";
                    userCommentForm.reset();
                    loadPublicComments();
                } else {
                    const errorData = await response.json();
                    userCommentStatus.textContent = errorData.message || "Failed to submit comment. Please try again.";
                    userCommentStatus.style.color = "red";
                }
            } catch (error) {
                console.error("Error submitting comment:", error);
                userCommentStatus.textContent = "An error occurred. Please try again later.";
                userCommentStatus.style.color = "red";
            }
        });
    }

    // وظائف تحميل وعرض التعليقات العامة
    async function loadPublicComments() {
        if (!publicCommentsContainer) return;
        const pageId = getPageId();

        try {
            const res = await fetch(`http://seller-support-production.up.railway.app/comments?pageId=${pageId}`);
            if (!res.ok) throw new Error('Failed to fetch comments');
            const comments = await res.json();

            publicCommentsContainer.innerHTML = "";
            if (comments.length === 0) {
                publicCommentsContainer.innerHTML = '<p>No comments yet.</p>';
                return;
            }

            comments.forEach((c) => {
                const card = document.createElement("div");
                card.className = "comment-card";

                card.innerHTML = `
                    <p><strong>${c.name || 'Anonymous'}</strong></p>
                    <p>${c.message}</p>
                    <small>${new Date(c.createdAt).toLocaleDateString()}</small>
                    ${c.reply && c.reply.message ? `<div class="reply"><strong>Admin:</strong> ${c.reply.message}</div>` : ""}
                `;
                publicCommentsContainer.appendChild(card);
            });
        } catch (error) {
            console.error("Error loading public comments:", error);
            publicCommentsContainer.innerHTML = '<p style="color:red;">Error loading comments.</p>';
        }
    }

    // معالج حدث لزر تصفير التقييمات
    if (resetButton) {
        resetButton.addEventListener("click", async () => {
            if (!confirm("Are you sure you want to reset all ratings? This action cannot be undone.")) {
                return;
            }

            try {
                const response = await fetch("http://seller-support-production.up.railway.app/ratings/reset", {
                    method: "DELETE",
                });

                if (response.ok) {
                    adminRatingStatus.textContent = "All ratings have been reset successfully!";
                    adminRatingStatus.style.color = "green";
                    loadAdminRatings(adminRatingsList);
                } else {
                    adminRatingStatus.textContent = "Failed to reset ratings. Please try again.";
                    adminRatingStatus.style.color = "red";
                }
            } catch (error) {
                console.error("Error resetting ratings:", error);
                adminRatingStatus.textContent = "An error occurred during reset. Please try again later.";
                adminRatingStatus.style.color = "red";
            }
        });
    }

    // تحميل البيانات عند تحميل DOM بالكامل
    if (overallAverageRating && totalRatingsCount) {
        loadOverallRating();
    }
    if (publicCommentsContainer) {
        loadPublicComments();
    }
    
    // تحميل بيانات المسؤول فقط إذا كانت عناصر لوحة المسؤول موجودة في الصفحة
    if (commentsContainerAdmin) {
        loadCommentsAdmin(commentsContainerAdmin);
    }
    if (adminRatingsList) {
        loadAdminRatings(adminRatingsList);
    }

    // الكود الخاص بنماذج الاتصال
    const enContactForm = document.getElementById('contactForm');
    if (enContactForm) {
        enContactForm.addEventListener('submit', handleFormSubmit);
    }
    
    const arContactForm = document.getElementById('contactForm-ar');
    if (arContactForm) {
        arContactForm.addEventListener('submit', handleFormSubmit);
    }

    const indexEnContactForm = document.getElementById('indexContactForm-en');
    if (indexEnContactForm) {
        indexEnContactForm.addEventListener('submit', handleFormSubmit);
    }
    
    const indexArContactForm = document.getElementById('indexContactForm-ar');
    if (indexArContactForm) {
        indexArContactForm.addEventListener('submit', handleFormSubmit);
    }
});