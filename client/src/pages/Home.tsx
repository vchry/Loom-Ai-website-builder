import api from "@/configs/axios";
import { authClient } from "@/lib/auth-client";
import { Loader2Icon } from "lucide-react";
import React, { useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Home = () => {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmitHandler = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!session?.user) {
        return toast.error("Please sign in to create a project");
      } else if (!input.trim()) {
        return toast.error("Please enter a message");
      }
      setLoading(true);
      const { data } = await api.post("/api/user/project", {
        initial_prompt: input,
      });
      setLoading(false);
      navigate(`/projects/${data.projectId}`);
    } catch (error: any) {
      setLoading(false);
      toast.error(error?.response?.data?.message || error.message);
      console.log(error);
    }
  };

  return (
    <section className="flex flex-col items-center justify-center min-h-screen text-white text-sm px-4 font-poppins">
      <h1 className="text-center text-[40px] leading-[48px] md:text-6xl md:leading-[70px] font-semibold max-w-3xl">
        Turn thoughts into Websites, with AI.
      </h1>

      <p className="text-center text-base max-w-md mt-2">
        Create, customize and publish website faster than ever with our AI Site
        Builder.
      </p>

      <form
        onSubmit={onSubmitHandler}
        className="bg-white/10 max-w-2xl w-full rounded-xl p-4 mt-10 border border-indigo-600/70 focus-within:ring-2 ring-indigo-500 transition-all"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="bg-transparent outline-none text-gray-300 resize-none w-full"
          rows={4}
          placeholder="Describe your presentation in details"
          required
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-[#CB52D4] to-indigo-600 rounded-md px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!loading ? (
              "Create with AI"
            ) : (
              <>
                Creating{" "}
                <Loader2Icon className="animate-spin size-4 text-white" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Company Logos */}
      <div className="flex flex-wrap items-center justify-center gap-10 md:gap-14 mt-10 opacity-40 grayscale">

        {/* Framer */}
        <svg height="20" viewBox="0 0 80 80" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 10 L60 10 L60 40 L40 40 L60 70 L40 70 L20 40 L40 40 L20 40Z" />
        </svg>

        {/* Huawei */}
        <svg height="24" viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg">
          <g fill="white">
            <ellipse cx="60" cy="30" rx="3" ry="22" transform="rotate(-60 60 30)"/>
            <ellipse cx="60" cy="30" rx="3" ry="22" transform="rotate(0 60 30)"/>
            <ellipse cx="60" cy="30" rx="3" ry="22" transform="rotate(60 60 30)"/>
            <ellipse cx="60" cy="30" rx="3" ry="22" transform="rotate(120 60 30)" opacity="0.6"/>
            <ellipse cx="60" cy="30" rx="3" ry="22" transform="rotate(180 60 30)" opacity="0.6"/>
            <ellipse cx="60" cy="30" rx="3" ry="22" transform="rotate(240 60 30)" opacity="0.6"/>
          </g>
        </svg>

        {/* Instagram */}
        <svg height="24" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" rx="22" fill="white"/>
          <rect x="18" y="18" width="64" height="64" rx="16" fill="none" stroke="#1a1a2e" strokeWidth="7"/>
          <circle cx="50" cy="50" r="17" fill="none" stroke="#1a1a2e" strokeWidth="7"/>
          <circle cx="73" cy="27" r="6" fill="#1a1a2e"/>
        </svg>

        {/* Microsoft */}
        <svg height="22" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <rect x="4"  y="4"  width="44" height="44" fill="white"/>
          <rect x="52" y="4"  width="44" height="44" fill="white"/>
          <rect x="4"  y="52" width="44" height="44" fill="white"/>
          <rect x="52" y="52" width="44" height="44" fill="white"/>
        </svg>

        {/* Walmart */}
        <svg height="24" viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg">
          <g fill="white">
            <ellipse cx="60" cy="30" rx="5" ry="20" transform="rotate(0 60 30)"/>
            <ellipse cx="60" cy="30" rx="5" ry="20" transform="rotate(60 60 30)"/>
            <ellipse cx="60" cy="30" rx="5" ry="20" transform="rotate(120 60 30)"/>
            <ellipse cx="60" cy="30" rx="5" ry="20" transform="rotate(30 60 30)"/>
            <ellipse cx="60" cy="30" rx="5" ry="20" transform="rotate(90 60 30)"/>
            <ellipse cx="60" cy="30" rx="5" ry="20" transform="rotate(150 60 30)"/>
          </g>
        </svg>

      </div>
    </section>
  );
};

export default memo(Home);