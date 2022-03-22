import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function () {
  const navigate = useNavigate()
  useEffect(() => {
    navigate("/repo/")
  }, [])
  return null
}
