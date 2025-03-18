import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convexClient";
import { useAuth } from "../auth/AuthContext";
import {
  Box,
  TextField,
  Button,
  Typography,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormControl,
  FormLabel,
  MenuItem,
  Select,
  Paper,
  InputLabel,
  Snackbar,
  Alert,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  LocalizationProvider,
  DatePicker,
  TimePicker,
} from "@mui/x-date-pickers";

const AddMedication = () => {
  const { user } = useAuth();
  const addMedication = useMutation(api.medications.addMedication);

  const [medicationName, setMedicationName] = useState("");
  const [description, setDescription] = useState("");
  const [reminderType, setReminderType] = useState("one-time");
  const [reminderDate, setReminderDate] = useState(null);
  const [reminderTime, setReminderTime] = useState(null);
  const [frequency, setFrequency] = useState("daily");
  const [dayOfWeek, setDayOfWeek] = useState("monday");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const formatTimeString = (date) => {
    if (!date) return null;
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      setSnackbarMessage("Please log in to add medications");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (!medicationName) {
      setSnackbarMessage("Please enter a medication name");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    try {
      const medicationData = {
        userId: user._id,
        medicineName: medicationName,
        description,
        reminderType,
      };

      if (reminderType === "one-time") {
        if (!reminderDate || !reminderTime) {
          setSnackbarMessage("Please select both date and time");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          return;
        }
        medicationData.reminderDate = reminderDate.getTime();
        medicationData.reminderTime = formatTimeString(reminderTime);
      } else if (reminderType === "recurring") {
        if (!startDate || !endDate || !reminderTime) {
          setSnackbarMessage("Please fill in all required fields");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          return;
        }

        medicationData.frequency = frequency;
        medicationData.startDate = startDate.getTime();
        medicationData.endDate = endDate.getTime();
        medicationData.reminderTimes = [formatTimeString(reminderTime)];

        if (frequency === "weekly") {
          medicationData.dayOfWeek = dayOfWeek;
        }
      }

      await addMedication(medicationData);

      // Reset form
      setMedicationName("");
      setDescription("");
      setReminderType("one-time");
      setReminderDate(null);
      setReminderTime(null);
      setFrequency("daily");
      setDayOfWeek("monday");
      setStartDate(null);
      setEndDate(null);

      setSnackbarMessage("Medication added successfully!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Error adding medication:", error);
      setSnackbarMessage("Error adding medication: " + error.message);
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper
        elevation={3}
        sx={{ p: 4, mb: 4, bgcolor: "background.paper", borderRadius: 2 }}
      >
        <Typography variant="h5" component="h1" gutterBottom>
          Add New Medication
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            {/* Medication Name */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Medication Name"
                value={medicationName}
                onChange={(e) => setMedicationName(e.target.value)}
                required
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Grid>

            {/* Reminder Type */}
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">Reminder Type</FormLabel>
                <RadioGroup
                  row
                  value={reminderType}
                  onChange={(e) => setReminderType(e.target.value)}
                >
                  <FormControlLabel
                    value="one-time"
                    control={<Radio />}
                    label="One Time Only"
                  />
                  <FormControlLabel
                    value="recurring"
                    control={<Radio />}
                    label="Recurring"
                  />
                </RadioGroup>
              </FormControl>
            </Grid>

            {/* One-Time Reminder Fields */}
            {reminderType === "one-time" && (
              <>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Date"
                    value={reminderDate}
                    onChange={setReminderDate}
                    renderInput={(params) => (
                      <TextField {...params} fullWidth required />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TimePicker
                    label="Time"
                    value={reminderTime}
                    onChange={setReminderTime}
                    renderInput={(params) => (
                      <TextField {...params} fullWidth required />
                    )}
                  />
                </Grid>
              </>
            )}

            {/* Recurring Reminder Fields */}
            {reminderType === "recurring" && (
              <>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Frequency</InputLabel>
                    <Select
                      value={frequency}
                      label="Frequency"
                      onChange={(e) => setFrequency(e.target.value)}
                    >
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {frequency === "weekly" && (
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Day of Week</InputLabel>
                      <Select
                        value={dayOfWeek}
                        label="Day of Week"
                        onChange={(e) => setDayOfWeek(e.target.value)}
                      >
                        <MenuItem value="monday">Monday</MenuItem>
                        <MenuItem value="tuesday">Tuesday</MenuItem>
                        <MenuItem value="wednesday">Wednesday</MenuItem>
                        <MenuItem value="thursday">Thursday</MenuItem>
                        <MenuItem value="friday">Friday</MenuItem>
                        <MenuItem value="saturday">Saturday</MenuItem>
                        <MenuItem value="sunday">Sunday</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                <Grid item xs={12} sm={4}>
                  <TimePicker
                    label="Time"
                    value={reminderTime}
                    onChange={setReminderTime}
                    renderInput={(params) => (
                      <TextField {...params} fullWidth required />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={setStartDate}
                    renderInput={(params) => (
                      <TextField {...params} fullWidth required />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <DatePicker
                    label="End Date"
                    value={endDate}
                    onChange={setEndDate}
                    renderInput={(params) => (
                      <TextField {...params} fullWidth required />
                    )}
                  />
                </Grid>
              </>
            )}

            {/* Submit Button */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
              >
                Add Medication
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </LocalizationProvider>
  );
};

export default AddMedication;
