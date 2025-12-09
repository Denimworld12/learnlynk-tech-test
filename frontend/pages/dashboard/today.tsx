"use client";

import { useState } from "react"; // 1. Import useState
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import styles from "@/styles/Home.module.css"; // Assuming this handles your styling

// Type definition for a task (Good practice)
type Task = {
  id: string;
  type: string;
  application_id: string;
  due_at: string;
  status: "pending" | "completed";
  // Add other fields as necessary
};

export default function TodayTasks() {
  const queryClient = useQueryClient();

  const [newTaskText, setNewTaskText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedTaskText, setEditedTaskText] = useState("");


  const {
    data: tasks,
    isLoading,
    error,
  } = useQuery<Task[]>({
    queryKey: ["tasks-today"],
    queryFn: async () => {
      // ... (existing logic to calculate start and end of today)
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .gte("due_at", start.toISOString())
        .lte("due_at", end.toISOString())
        .neq("status", "completed");

      if (error) throw error;
      return data as Task[];
    },
  });

  const createTask = useMutation({
    mutationFn: async (taskData: { type: string; due_at: string }) => {
      const { error } = await supabase.from("tasks").insert([
        {
          type: taskData.type,
          due_at: taskData.due_at,
          status: "pending",
          application_id: "N/A", // Default for new task
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate the query to refetch tasks immediately
      queryClient.invalidateQueries({ queryKey: ["tasks-today"] });
      setNewTaskText(""); // Clear the input field
    },
  });

  const markComplete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "completed" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks-today"] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks-today"] });
    },
  });


  const updateTask = useMutation({
    mutationFn: async ({ id, newType }: { id: string; newType: string }) => {
      // NOTE: Here we are only allowing the 'type' field to be updated.
      // You would extend this object to update other fields like application_id or due_at.
      const { error } = await supabase
        .from("tasks")
        .update({ type: newType })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks-today"] });
      setEditingId(null); // Exit edit mode
      setEditedTaskText("");
    },
  });

  // -----------------------------
  // Loading UI (Existing)
  // -----------------------------
  if (isLoading)
    return (
      <div className={styles.loadingWrapper}>
        <div className={styles.loader}></div>
        <p>Loading today's tasks...</p>
      </div>
    );

  // -----------------------------
  // Error UI (Existing)
  // -----------------------------
  if (error)
    return (
      <div className={styles.errorBox}>
        <p>❌ Error loading tasks</p>
        <span>{error.message}</span>
      </div>
    );

  // -----------------------------
  // Handlers for new Task
  // -----------------------------
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    // Set due time to end of today for the new task
    const due_at = new Date();
    due_at.setHours(23, 59, 59, 999);

    createTask.mutate({
      type: newTaskText.trim(),
      due_at: due_at.toISOString(),
    });
  };

  // -----------------------------
  // Handlers for Update Task
  // -----------------------------
  const handleStartEdit = (task: Task) => {
    setEditingId(task.id);
    setEditedTaskText(task.type); // Pre-fill the input with current 'type'
  };

  const handleUpdateTask = (id: string) => {
    if (!editedTaskText.trim()) return;
    updateTask.mutate({ id, newType: editedTaskText.trim() });
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedTaskText("");
  };

  return (
    <div className={styles.main}>
      <div className={styles.intro}>
        <h1>Today’s Tasks</h1>
        <p>These are all pending tasks due before the end of the day.</p>
      </div>

      <hr/>

      {/* -----------------------------
          5. Create Task Form (Input Data UI)
          ----------------------------- */}
      <h2>➕ Add New Task</h2>
      <form onSubmit={handleCreateTask} className={styles.addTaskForm}>
        <input
          type="text"
          placeholder="e.g. Call client about invoice"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          disabled={createTask.isPending}
          className={styles.textInput}
        />
        <button
          type="submit"
          className={styles.primaryButton}
          disabled={createTask.isPending || !newTaskText.trim()}
        >
          {createTask.isPending ? "Adding..." : "Add Task"}
        </button>
      </form>

      <hr/>

      {/* -----------------------------
          Empty State UI (Existing)
          ----------------------------- */}
      {tasks?.length === 0 && (
        <div className={styles.emptyState}>
          <p>No tasks due today 🎉</p>
        </div>
      )}

      {/* -----------------------------
          Tasks Table (Updated to include Delete and Update)
          ----------------------------- */}
      {tasks && tasks.length > 0 && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Application</th>
                <th>Due</th>
                <th>Status</th>
                <th>Actions</th> {/* New column for actions */}
              </tr>
            </thead>

            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  {/* Task Type/Edit Field */}
                  <td className={styles.typeCell}>
                    {editingId === task.id ? (
                      <input
                        type="text"
                        value={editedTaskText}
                        onChange={(e) => setEditedTaskText(e.target.value)}
                        className={styles.editInput}
                      />
                    ) : (
                      task.type
                    )}
                  </td>

                  <td>{task.application_id}</td>
                  <td>{new Date(task.due_at).toLocaleString()}</td>

                  {/* Status */}
                  <td>
                    <span
                      className={
                        task.status === "completed"
                          ? styles.statusDone
                          : styles.statusPending
                      }
                    >
                      {task.status}
                    </span>
                  </td>

                  {/* Actions (Complete, Edit, Delete) */}
                  <td className={styles.actionsCell}>
                    {editingId === task.id ? (
                      <>
                        <button
                          className={styles.primaryButton}
                          onClick={() => handleUpdateTask(task.id)}
                          disabled={updateTask.isPending}
                        >
                          💾 Save
                        </button>
                        <button
                          className={styles.secondaryButton}
                          onClick={handleCancelEdit}
                          disabled={updateTask.isPending}
                        >
                          ✖ Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className={styles.primaryButton}
                          onClick={() => markComplete.mutate(task.id)}
                          disabled={markComplete.isPending}
                        >
                          ✔ Complete
                        </button>
                        <button
                          className={styles.secondaryButton}
                          onClick={() => handleStartEdit(task)}
                        >
                          ✏ Edit
                        </button>
                        <button
                          className={styles.deleteButton}
                          onClick={() => deleteTask.mutate(task.id)}
                          disabled={deleteTask.isPending}
                        >
                          🗑 Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}