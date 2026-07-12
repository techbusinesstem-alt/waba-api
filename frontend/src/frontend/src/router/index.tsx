import { createBrowserRouter } from "react-router-dom";
import Dashboard from "../pages/Dashboard";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Dashboard />, // Abhi ke liye Dashboard ko home banaya hai
  },
  // Baaki routes yahan add honge (CRM, Inventory, etc.)
]);
