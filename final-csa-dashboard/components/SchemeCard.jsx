// framework
import Image from "next/image";
import { useRouter } from "next/router";
// images
import caseimg from "../public/case_scenario.png";

export default function SchemeCard({
  scheme_name,
  scheme_img,
  questions,
  scheme_button,
}) {
  const router = useRouter();

  function onClick() {
    var pagename = scheme_name.toLowerCase();
    router.push(`/${pagename}/exercises`, undefined, { shallow: true });
  }

  return (
    <div className="flex flex-col p-4 border-4 rounded-xl max-w-[350px] relative items-start">
      <img
        src={scheme_img}
        alt="scheme image"
        className="rounded-xl object-cover w-60 h-60"
      />
      <div className="font-bold pt-2 pb-4">{scheme_name}</div>
      <div className="flex flex-row gap-2">
        <Image src={caseimg} alt="case icon" width="auto" height="auto" />
        <span>Case Scenarios: {questions} </span>
      </div>
      {scheme_button ? (
        <div className="flex flex-row gap-2 pt-6">
          <button
            onClick={onClick}
            className="bg-dark-green text-white py-2 px-4 rounded-md hover:bg-darker-green"
          >
            Start Training
          </button>
        </div>
      ) : null}
    </div>
  );
}
