import React, { useState } from "react";
import { useQuery, useAction } from "convex/react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  CloudDownload as DownloadIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { useAuth } from "../auth/AuthContext";
import { api } from "../../convexClient";

const ReportsList = () => {
  const { user } = useAuth();
  const userId = user?._id;

  const reports =
    useQuery(api.reports.getReports, userId ? { userId } : "skip") || [];

  const requestReport = useAction(api.actions.reportsAction.requestReport);

  const [openDialog, setOpenDialog] = useState(false);
  const [reportType, setReportType] = useState("weekly");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleOpenDialog = () => {
    setOpenDialog(true);
    setReportType("weekly");
    setStartDate(null);
    setEndDate(null);
    setError("");
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleRequestReport = async () => {
    try {
      setLoading(true);
      setError("");

      const args = {
        userId,
        reportType,
      };

      // Add date range for custom reports
      if (reportType === "custom") {
        if (!startDate || !endDate) {
          setError("Please select both start and end dates");
          setLoading(false);
          return;
        }

        args.startDate = startDate.getTime();
        args.endDate = endDate.getTime();
      }

      await requestReport(args);
      setLoading(false);
      handleCloseDialog();
    } catch (err) {
      setError(`Error requesting report: ${err.message}`);
      setLoading(false);
    }
  };

  const getStatusChipColor = (status) => {
    switch (status) {
      case "completed":
        return "success";
      case "processing":
        return "warning";
      case "failed":
        return "error";
      default:
        return "default";
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getReportTypeName = (type) => {
    switch (type) {
      case "weekly":
        return "Weekly Report";
      case "custom":
        return "Custom Report";
      default:
        return type;
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5" component="h2">
          Medication Reports
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          Request New Report
        </Button>
      </Box>

      {reports.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="body1" color="textSecondary">
            You haven't requested any reports yet.
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            sx={{ mt: 2 }}
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
          >
            Request Your First Report
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Report Type</TableCell>
                <TableCell>Generated</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report._id}>
                  <TableCell>{getReportTypeName(report.reportType)}</TableCell>
                  <TableCell>{formatDate(report.generatedAt)}</TableCell>
                  <TableCell>
                    <Chip
                      label={
                        report.status.charAt(0).toUpperCase() +
                        report.status.slice(1)
                      }
                      color={getStatusChipColor(report.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {report.status === "completed" && report.reportUrl ? (
                      <Tooltip title="Download Report">
                        <IconButton
                          color="primary"
                          component="a"
                          href={report.reportUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip
                        title={
                          report.status === "failed"
                            ? "Report generation failed"
                            : "Processing"
                        }
                      >
                        <span>
                          <IconButton disabled>
                            {report.status === "processing" ? (
                              <CircularProgress size={24} />
                            ) : (
                              <DownloadIcon />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* New Report Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Request New Report</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Select the type of report you would like to generate.
          </DialogContentText>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Report Type</InputLabel>
            <Select
              value={reportType}
              label="Report Type"
              onChange={(e) => setReportType(e.target.value)}
            >
              <MenuItem value="weekly">Weekly Report</MenuItem>
              <MenuItem value="custom">Custom Date Range</MenuItem>
            </Select>
          </FormControl>

          {reportType === "custom" && (
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  flexDirection: { xs: "column", sm: "row" },
                }}
              >
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                  maxDate={endDate || undefined}
                />
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                  minDate={startDate || undefined}
                  maxDate={new Date()}
                />
              </Box>
            </LocalizationProvider>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleRequestReport}
            color="primary"
            variant="contained"
            disabled={
              loading || (reportType === "custom" && (!startDate || !endDate))
            }
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? "Requesting..." : "Request Report"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportsList;
