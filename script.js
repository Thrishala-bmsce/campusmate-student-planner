
const STORAGE_KEY = "campusmate_tasks_v1";

const taskForm = document.getElementById("taskForm");
const taskIdInput = document.getElementById("taskId");
const titleInput = document.getElementById("taskTitle");
const subjectInput = document.getElementById("taskSubject");
const deadlineInput = document.getElementById("taskDeadline");
const priorityInput = document.getElementById("taskPriority");
const taskList = document.getElementById("taskList");
const emptyMessage = document.getElementById("emptyMessage");
const formMessage = document.getElementById("formMessage");

const searchInput = document.getElementById("searchInput");
const filterStatus = document.getElementById("filterStatus");
const filterPriority = document.getElementById("filterPriority");

let tasks = loadTasks();

function loadTasks() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Could not load saved tasks:", error);
        return [];
    }
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch (error) {
        console.error("Could not save tasks:", error);
        alert("Your browser could not save the tasks. Check browser storage settings.");
        return false;
    }
}

function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function makeButton(text, className, action) {
    const button = makeElement("button", className, text);
    button.type = "button";
    button.addEventListener("click", action);
    return button;
}

function showMessage(message) {
    formMessage.textContent = message;
}

function formatDate(dateString) {
    if (!dateString) return "No deadline";
    const parts = dateString.split("-");
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function isOverdue(task) {
    const today = new Date();
    const localToday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    );
    const deadline = new Date(task.deadline + "T00:00:00");
    return !task.completed && deadline < localToday;
}

function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;
    const progress = total === 0 ? 0 : Math.round(completed / total * 100);

    document.getElementById("totalCount").textContent = total;
    document.getElementById("completedCount").textContent = completed;
    document.getElementById("pendingCount").textContent = pending;
    document.getElementById("progressCount").textContent = progress + "%";
    document.getElementById("progressLabel").textContent =
        progress + "% completed";
    document.getElementById("progressBar").style.width = progress + "%";
}

function renderTasks() {
    taskList.replaceChildren();

    const search = searchInput.value.trim().toLowerCase();
    const status = filterStatus.value;
    const priority = filterPriority.value;

    const visibleTasks = tasks
        .filter(task => {
            const matchesSearch =
                task.title.toLowerCase().includes(search) ||
                task.subject.toLowerCase().includes(search);

            const matchesStatus =
                status === "All" ||
                (status === "Completed" && task.completed) ||
                (status === "Pending" && !task.completed);

            const matchesPriority =
                priority === "All" || task.priority === priority;

            return matchesSearch && matchesStatus && matchesPriority;
        })
        .sort((a, b) => {
            if (a.completed !== b.completed) {
                return Number(a.completed) - Number(b.completed);
            }
            return a.deadline.localeCompare(b.deadline);
        });

    emptyMessage.classList.toggle("hidden", visibleTasks.length > 0);

    if (visibleTasks.length === 0) {
        emptyMessage.textContent = tasks.length === 0
            ? "No tasks yet. Add your first study task above! 💜"
            : "No matching tasks. Try changing your search or filters.";
    }

    visibleTasks.forEach(task => {
        const item = makeElement(
            "article",
            "task-item" + (task.completed ? " done" : "")
        );

        const main = makeElement("div", "task-main");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.completed;
        checkbox.setAttribute(
            "aria-label",
            "Mark " + task.title + " as completed"
        );

        checkbox.addEventListener("change", () => {
            const previous = task.completed;
            task.completed = checkbox.checked;

            if (!saveTasks()) {
                task.completed = previous;
                renderAll();
                return;
            }

            renderAll();
        });

        const details = makeElement("div", "task-details");
        details.appendChild(makeElement("h4", "", task.title));
        details.appendChild(makeElement(
            "p", "", "Subject: " + task.subject
        ));
        details.appendChild(makeElement(
            "p", "", "Deadline: " + formatDate(task.deadline)
        ));

        const badges = makeElement("div", "badges");
        const priorityBadge = makeElement(
            "span", "badge " + task.priority.toLowerCase(),
            task.priority + " priority"
        );
        badges.appendChild(priorityBadge);

        if (task.completed) {
            badges.appendChild(makeElement("span", "badge", "Completed"));
        } else if (isOverdue(task)) {
            badges.appendChild(makeElement("span", "badge overdue", "Overdue"));
        } else {
            badges.appendChild(makeElement("span", "badge", "Pending"));
        }

        details.appendChild(badges);
        main.append(checkbox, details);

        const actions = makeElement("div", "task-actions");
        actions.appendChild(makeButton("Edit", "small-btn", () => editTask(task.id)));
        actions.appendChild(makeButton("Delete", "small-btn delete-btn", () => deleteTask(task.id)));

        item.append(main, actions);
        taskList.appendChild(item);
    });

    updateStats();
}

function renderAll() {
    renderTasks();
}

function resetForm() {
    taskForm.reset();
    taskIdInput.value = "";
    priorityInput.value = "Medium";
    document.getElementById("formTitle").textContent = "Add a new task";
    document.getElementById("submitButton").textContent = "+ Add task";
    document.getElementById("cancelEdit").classList.add("hidden");
}

taskForm.addEventListener("submit", event => {
    event.preventDefault();

    const title = titleInput.value.trim();
    const subject = subjectInput.value.trim();
    const deadline = deadlineInput.value;
    const priority = priorityInput.value;
    const editingId = taskIdInput.value;

    if (!title || !subject || !deadline) {
        showMessage("Please complete all required fields.");
        return;
    }

    if (!["High", "Medium", "Low"].includes(priority)) {
        showMessage("Please choose a valid priority.");
        return;
    }

    if (editingId) {
        const task = tasks.find(item => item.id === editingId);
        if (!task) {
            showMessage("Task not found. Please try again.");
            resetForm();
            return;
        }

        const oldTask = { ...task };
        Object.assign(task, { title, subject, deadline, priority });

        if (!saveTasks()) {
            Object.assign(task, oldTask);
            return;
        }

        showMessage("Task updated successfully! 💜");
    } else {
        const newTask = {
            id: Date.now().toString() + Math.random().toString(16).slice(2),
            title,
            subject,
            deadline,
            priority,
            completed: false
        };

        tasks.push(newTask);

        if (!saveTasks()) {
            tasks = tasks.filter(item => item.id !== newTask.id);
            return;
        }

        showMessage("Task added successfully! 🎉");
    }

    resetForm();
    renderAll();
});

function editTask(id) {
    const task = tasks.find(item => item.id === id);
    if (!task) return;

    taskIdInput.value = task.id;
    titleInput.value = task.title;
    subjectInput.value = task.subject;
    deadlineInput.value = task.deadline;
    priorityInput.value = task.priority;

    document.getElementById("formTitle").textContent = "Edit task";
    document.getElementById("submitButton").textContent = "Save changes";
    document.getElementById("cancelEdit").classList.remove("hidden");

    showMessage("Update the fields, then select Save changes.");
    titleInput.focus();
    taskForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function deleteTask(id) {
    const task = tasks.find(item => item.id === id);
    if (!task) return;

    if (!confirm('Delete "' + task.title + '"?')) return;

    const previousTasks = tasks;
    tasks = tasks.filter(item => item.id !== id);

    if (!saveTasks()) {
        tasks = previousTasks;
        return;
    }

    if (taskIdInput.value === id) resetForm();
    showMessage("Task deleted.");
    renderAll();
}

document.getElementById("cancelEdit").addEventListener("click", () => {
    resetForm();
    showMessage("Editing cancelled.");
});

searchInput.addEventListener("input", renderTasks);
filterStatus.addEventListener("change", renderTasks);
filterPriority.addEventListener("change", renderTasks);

document.getElementById("clearCompleted").addEventListener("click", () => {
    const completedTasks = tasks.filter(task => task.completed);

    if (completedTasks.length === 0) {
        showMessage("There are no completed tasks to clear.");
        return;
    }

    if (!confirm("Delete all " + completedTasks.length + " completed task(s)?")) {
        return;
    }

    const previousTasks = tasks;
    tasks = tasks.filter(task => !task.completed);

    if (!saveTasks()) {
        tasks = previousTasks;
        return;
    }

    resetForm();
    showMessage("Completed tasks cleared.");
    renderAll();
});

renderAll();
