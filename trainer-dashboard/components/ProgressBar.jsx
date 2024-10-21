export default function ProgressBar({ attemptedNum, qnNum, schemeName }) {
  const percent = Math.floor((attemptedNum / qnNum) * 100).toString();

  return (
    <div className="flex flex-col w-full gap-2">
      <div>{schemeName}</div>
      <div className="flex flex-row w-full justify-around items-center gap-2">
        <div className="w-4/5 bg-white rounded-xl shadow-sm overflow-hidden p-1">
          <div className="relative h-6 flex items-center justify-center">
            <div
              style={{ width: `${percent}%` }}
              className={`absolute top-0 bottom-0 left-0 rounded-lg bg-green-200`}
            ></div>
            <div className="relative text-green-900 font-medium text-sm">
              {percent}%
            </div>
          </div>
        </div>
        <div className="flex flex-row items-end gap-1">
          {attemptedNum}/{qnNum} <span className="text-sm">completed</span>
        </div>
      </div>
    </div>
  );
}
