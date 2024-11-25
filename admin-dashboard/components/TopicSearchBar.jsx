import { IoMdSearch } from "react-icons/io";

export default function TopicSearchBar({ setSearch }) {
  return (
    <div className="relative">
      <input
        className="bg-light-gray pl-7 pr-14 rounded-md py-1 w-80"
        type="text"
        placeholder="Search by Topic"
        onChange={(e) => setSearch(e.target.value)}
      />
      <IoMdSearch
        size={24}
        className="absolute text-slate-300 top-1.5 left-1"
      />
    </div>
  );
}
