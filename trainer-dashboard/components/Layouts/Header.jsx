"use client";

// framework
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
// icons and images
import cpfImage from "../../public/cpf_image_resized.png";
import { AiOutlineUser } from "react-icons/ai";
import { IoIosLogOut } from "react-icons/io";

export default function Header({ user, setUser }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    event.preventDefault();
    window.localStorage.clear();
    setUser("");
    router.push("/");
  };

  return (
    <div className="bg-dark-green text-white h-max-10 text-xs flex flex-row justify-between px-10 py-3">
      <div className="flex flex-row items-center">
        <Image height={60} src={cpfImage} alt="CPF logo" />
        <div className=" text-x">
          CPF Board
          <br />
        </div>
      </div>
      {user ? (
        <div className="flex flex-row w-1/2 justify-between">
          <div className="flex flex-row items-center gap-5">
            <Link
              href="/myteam"
              className={`${
                pathname == "/myteam"
                  ? "font-bold underline underline-offset-3 decoration-white"
                  : "font-normal no-underline"
              }`}
            >
              Trainees
            </Link>
          </div>
          <button className="flex items-center gap-2" onClick={handleLogout}>
            Logout
            <IoIosLogOut size={20} />
          </button>
        </div>
      ) : (
        <Link href="/" className="flex flex-row items-center gap-2">
          <AiOutlineUser size={20} />
          Log In
        </Link>
      )}
    </div>
  );
}
