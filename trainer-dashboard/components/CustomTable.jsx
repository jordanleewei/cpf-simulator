import * as React from "react";
import { styled } from "@mui/system";
import {
  TablePagination,
  tablePaginationClasses as classes,
} from "@mui/base/TablePagination";
import FirstPageRoundedIcon from "@mui/icons-material/FirstPageRounded";
import LastPageRoundedIcon from "@mui/icons-material/LastPageRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { useRouter } from "next/navigation";
import ProfileSearchBar from "./ProfileSearchBar";
import KeywordSearchBar from "./KeywordSearchBar";

export default function TableCustomized({ rows, user_id }) {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(6);
  const [filterScheme, setFilterScheme] = React.useState("");
  const [keyword, setKeyword] = React.useState("");

  const router = useRouter();

  // Avoid a layout jump when reaching the last page with empty rows.
  const emptyRows =
    page > 0 ? Math.max(0, (1 + page) * rowsPerPage - rows.length) : 0;

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  function handleReviewNav(review_id) {
    router.push(
      {
        pathname: `/${review_id}/${user_id}/review`,
      },
      { pathname: `/${review_id}/${user_id}/review` },
      {
        shallow: true,
      }
    );
  }

  function handleImprovementNav(improve_id) {
    console.log("Navigating to Improvement:", `/${improve_id}/${user_id}/improvement`);
    console.log("user_id passed to TableCustomized:", user_id);
    router.push(
      `/${improve_id}/${user_id}/improvement`
    );
  }

  function handleManualFeedbackNav(feedback_id) {
    console.log("Navigating to Manual Feedback:", `/${feedback_id}/${user_id}/feedback`);
    router.push(
      {
        pathname: `/${feedback_id}/${user_id}/feedback`,
      },
      { pathname: `/${feedback_id}/${user_id}/feedback` },
      {
        shallow: true,
      }
    );
  }

  // Filter rows based on scheme name and keyword
  const filteredRows = rows.filter((row) => {
    const matchesScheme = row.scheme_name.toLowerCase().includes(filterScheme.toLowerCase());
    const matchesKeyword = row.question_details?.toLowerCase().includes(keyword.toLowerCase());
    return matchesScheme && matchesKeyword;
  });

  return (
    <Root sx={{ maxWidth: "100%", width: "100%" }}>
      {/* Search Bars */}
      <div className="flex gap-4 mb-4">
        <ProfileSearchBar setSearch={setFilterScheme} />
        <KeywordSearchBar setSearch={setKeyword} />
      </div>
      <table aria-label="custom pagination table">
        <thead>
          <tr>
            <th className="bg-dark-grey">Question</th>
            <th className="bg-dark-grey">Scheme</th>
            <th className="bg-dark-grey">Time Completed</th>
            <th className="bg-dark-grey">Attempt No.</th> {/* New Column */}
            <th className="bg-dark-grey">Transcript</th>
            <th className="bg-dark-grey">Supervisor Feedback</th> {/* Manual Feedback Column */}
            <th className="bg-dark-grey">Improvement Feedback</th> {/* Feedback Column */}
          </tr>
        </thead>
        <tbody>
          {(rowsPerPage > 0
            ? filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            : filteredRows
          ).map((row, idx) => (
            <tr key={idx}>
              <td>{row.question_title}</td>
              <td>{row.scheme_name}</td>
              <td align="right">
                {(() => {
                  const date = new Date(row.date); // Parse the date
                  date.setUTCHours(date.getUTCHours() + 8); // Add 8 hours to UTC time
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, "0"); // Ensure 2-digit month
                  const day = String(date.getDate()).padStart(2, "0"); // Ensure 2-digit day
                  const hours = String(date.getHours()).padStart(2, "0"); // Ensure 2-digit hours
                  const minutes = String(date.getMinutes()).padStart(2, "0"); // Ensure 2-digit minutes
                  return `${year}-${month}-${day} ${hours}:${minutes}`; // Format as YYYY-MM-DD HH:mm
                })()}
              </td>
              <td align="right">{row.attemptCount}</td> {/* Display Attempt Count */}
              <td
                align="right"
                className="hover:underline hover:underline-offset-2 hover:cursor-pointer"
                onClick={() => handleReviewNav(row.attempt_id)}
              >
                Click to view attempt
              </td>
              <td
                align="right"
                className="hover:underline hover:underline-offset-2 hover:cursor-pointer"
                onClick={() => handleManualFeedbackNav(row.attempt_id)}
              >
                Click to view supervisor feedback
              </td>
              <td
                align="right"
                className="hover:underline hover:underline-offset-2 hover:cursor-pointer"
                onClick={() => handleImprovementNav(row.question_id)}
              >
                Click to view improvement feedback
              </td> {/* Improvement Column */}
            </tr>
          ))}

          {emptyRows > 0 && (
            <tr style={{ height: 34 * emptyRows }}>
              <td colSpan={5} aria-hidden />
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <CustomTablePagination
              rowsPerPageOptions={[10]}
              colSpan={5} // Updated colSpan to 5 to include the new column
              count={filteredRows.length} 
              rowsPerPage={rowsPerPage}
              page={page}
              slotProps={{
                select: {
                  "aria-label": "rows per page",
                },
                actions: {
                  showFirstButton: true,
                  showLastButton: true,
                  slots: {
                    firstPageIcon: FirstPageRoundedIcon,
                    lastPageIcon: LastPageRoundedIcon,
                    nextPageIcon: ChevronRightRoundedIcon,
                    backPageIcon: ChevronLeftRoundedIcon,
                  },
                },
              }}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </tr>
        </tfoot>
      </table>
    </Root>
  );
}

const blue = {
  50: "#F0F7FF",
  200: "#A5D8FF",
  400: "#3399FF",
  900: "#003A75",
};

const grey = {
  50: "#F3F6F9",
  100: "#E5EAF2",
  200: "#DAE2ED",
  300: "#C7D0DD",
  400: "#B0B8C4",
  500: "#9DA8B7",
  600: "#6B7A90",
  700: "#434D5B",
  800: "#303740",
  900: "#1C2025",
};

const Root = styled("div")(
  ({ theme }) => `
  border-radius: 12px;
  border: 1px solid ${theme.palette.mode === "dark" ? grey[800] : grey[200]};
  overflow: clip;

  table {
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 0.875rem;
    border-collapse: collapse;
    border: none;
    width: 100%;
    margin: -1px;
  }

  td,
  th {
    border: 1px solid ${theme.palette.mode === "dark" ? grey[800] : grey[200]};
    text-align: left;
    padding: 8px;
  }

  `
);

const CustomTablePagination = styled(TablePagination)(
  ({ theme }) => `
  & .${classes.spacer} {
    display: none;
  }

  & .${classes.toolbar}  {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 4px 0;

    @media (min-width: 768px) {
      flex-direction: row;
      align-items: center;
    }
  }

  & .${classes.selectLabel} {
    margin: 0;
  }

  & .${classes.select}{
    font-family: 'IBM Plex Sans', sans-serif;
    padding: 2px 0 2px 4px;
    border: 1px solid ${theme.palette.mode === "dark" ? grey[800] : grey[200]};
    border-radius: 6px; 
    background-color: transparent;
    color: ${theme.palette.mode === "dark" ? grey[300] : grey[900]};
    transition: all 100ms ease;

    &:hover {
      background-color: ${theme.palette.mode === "dark" ? grey[800] : grey[50]};
      border-color: ${theme.palette.mode === "dark" ? grey[600] : grey[300]};
    }

    &:focus {
      outline: 3px solid ${
        theme.palette.mode === "dark" ? blue[400] : blue[200]
      };
      border-color: ${blue[400]};
    }
  }

  & .${classes.displayedRows} {
    margin: 0;

    @media (min-width: 768px) {
      margin-left: auto;
    }
  }

  & .${classes.actions} {
    display: flex;
    gap: 6px;
    border: transparent;
    text-align: center;
  }

  & .${classes.actions} > button {
    display: flex;
    align-items: center;
    padding: 0;
    border: transparent;
    border-radius: 50%;
    background-color: transparent;
    border: 1px solid ${theme.palette.mode === "dark" ? grey[800] : grey[200]};
    color: ${theme.palette.mode === "dark" ? grey[300] : grey[900]};
    transition: all 120ms ease;

    > svg {
      font-size: 22px;
    }

    &:hover {
      background-color: ${theme.palette.mode === "dark" ? grey[800] : grey[50]};
      border-color: ${theme.palette.mode === "dark" ? grey[600] : grey[300]};
    }

    &:focus {
      outline: 3px solid ${
        theme.palette.mode === "dark" ? blue[400] : blue[200]
      };
      border-color: ${blue[400]};
    }

    &:disabled {
      opacity: 0.3;
      &:hover {
        border: 1px solid ${
          theme.palette.mode === "dark" ? grey[800] : grey[200]
        };
        background-color: transparent;
      }
    }
  }
  `
);
