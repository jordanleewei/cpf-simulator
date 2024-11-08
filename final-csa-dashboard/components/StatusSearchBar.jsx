import { IoMdSearch } from "react-icons/io";

export default function StatusSearchBar({ setFilter }) {
  return (
    <div className="relative">
      <select
        className="bg-light-gray pl-7 pr-10 rounded-md py-1 w-80"
        onChange={(e) => setFilter(e.target.value)}
      >
        <option value="">Select Status</option>
        <option value="completed">Completed</option>
        <option value="uncompleted">Incomplete</option>
      </select>
      <IoMdSearch
        size={24}
        className="absolute text-slate-300 top-1.5 left-1"
      />
    </div>
  );
}