import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convexClient";
import { useAuth } from "../auth/AuthContext";
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Snackbar,
  Alert,
  Divider,
  Tab,
  Tabs,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { format } from "date-fns";

const MedicationList = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [notes, setNotes] = useState("");
  const [markAsTakenDialogOpen, setMarkAsTakenDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const medications = useQuery(
    api.medications.getMedications,
    user ? { userId: user._id } : null
  );

  const deleteMedication = useMutation(api.medications.deleteMedication);
  const markMedicationAsDone = useMutation(
    api.medications.markMedicationAsDone
  );

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleDeleteClick = (medication) => {
    setSelectedMedication(medication);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedMedication) return;

    try {
      await deleteMedication({
        medicationId: selectedMedication._id,
        userId: user._id,
      });
      setSnackbarMessage("Medication deleted successfully");
      setSnackbarSeverity("success");
    } catch (error) {
      console.error("Error deleting medication:", error);
      setSnackbarMessage("Error deleting medication: " + error.message);
      setSnackbarSeverity("error");
    }

    setSnackbarOpen(true);
    setDeleteDialogOpen(false);
    setSelectedMedication(null);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSelectedMedication(null);
  };

  const handleMarkAsTakenClick = (medication) => {
    setSelectedMedication(medication);
    setNotes("");
    setMarkAsTakenDialogOpen(true);
  };

  const handleMarkAsTakenConfirm = async () => {
    if (!selectedMedication) return;

    try {
      await markMedicationAsDone({
        medicationId: selectedMedication._id,
        userId: user._id,
        notes: notes,
      });
      setSnackbarMessage("Medication marked as taken");
      setSnackbarSeverity("success");
    } catch (error) {
      console.error("Error marking medication as taken:", error);
      setSnackbarMessage("Error marking medication as taken: " + error.message);
      setSnackbarSeverity("error");
    }

    setSnackbarOpen(true);
    setMarkAsTakenDialogOpen(false);
    setSelectedMedication(null);
  };

  const handleMarkAsTakenCancel = () => {
    setMarkAsTakenDialogOpen(false);
    setSelectedMedication(null);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const formatMedicationSchedule = (medication) => {
    if (medication.reminderType === "one-time") {
      return `${format(new Date(medication.reminderDate), "PP")} at ${medication.reminderTime}`;
    } else if (medication.reminderType === "recurring") {
      let schedule =
        medication.frequency === "daily"
          ? "Daily"
          : `Weekly on ${medication.dayOfWeek.charAt(0).toUpperCase() + medication.dayOfWeek.slice(1)}`;
      schedule += ` at ${medication.reminderTimes?.[0] || ""}`;
      schedule += ` from ${format(new Date(medication.startDate), "PP")} to ${format(new Date(medication.endDate), "PP")}`;
      return schedule;
    }
    return "";
  };

  // Filter medications based on selected tab
  const filteredMedications = medications?.filter((med) => {
    if (tabValue === 0) return true; // All medications
    if (tabValue === 1) return !med.isCompleted; // Active medications
    if (tabValue === 2) return med.isCompleted; // Completed medications
    return true;
  });

  if (!user) {
    return (
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography>Please log in to view your medications</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5" component="h1">
          Your Medications
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={() => {
            // This will trigger a refetch due to the query hook
            setSnackbarMessage("Medications refreshed");
            setSnackbarSeverity("info");
            setSnackbarOpen(true);
          }}
        >
          Refresh
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="medication tabs"
        >
          <Tab label="All" />
          <Tab label="Active" />
          <Tab label="Completed" />
        </Tabs>
      </Box>

      {medications === undefined ? (
        <Typography>Loading medications...</Typography>
      ) : medications.length === 0 ? (
        <Typography>
          No medications found. Add one using the form above.
        </Typography>
      ) : filteredMedications.length === 0 ? (
        <Typography>No medications in this category.</Typography>
      ) : (
        <List>
          {filteredMedications.map((medication) => (
            <React.Fragment key={medication._id}>
              <ListItem
                sx={{
                  bgcolor: "background.default",
                  borderRadius: 1,
                  mb: 1,
                }}
                secondaryAction={
                  <Box>
                    {!medication.isCompleted && (
                      <IconButton
                        edge="end"
                        aria-label="mark as taken"
                        onClick={() => handleMarkAsTakenClick(medication)}
                        sx={{ mr: 1 }}
                      >
                        <CheckCircleIcon color="success" />
                      </IconButton>
                    )}
                    <IconButton
                      edge="end"
                      aria-label="edit"
                      sx={{ mr: 1 }}
                      // TODO: Implement edit functionality
                    >
                      <EditIcon color="primary" />
                    </IconButton>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleDeleteClick(medication)}
                    >
                      <DeleteIcon color="error" />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Typography variant="subtitle1" component="span">
                        {medication.medicineName}
                      </Typography>
                      {medication.isCompleted && (
                        <Chip
                          label="Completed"
                          color="success"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                      <Chip
                        label={
                          medication.reminderType === "one-time"
                            ? "One-time"
                            : "Recurring"
                        }
                        color={
                          medication.reminderType === "one-time"
                            ? "secondary"
                            : "primary"
                        }
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography
                        variant="body2"
                        component="span"
                        color="text.secondary"
                      >
                        {medication.description && (
                          <>
                            {medication.description}
                            <br />
                          </>
                        )}
                        {formatMedicationSchedule(medication)}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))}
        </List>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the medication "
            {selectedMedication?.medicineName}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mark as Taken Dialog */}
      <Dialog open={markAsTakenDialogOpen} onClose={handleMarkAsTakenCancel}>
        <DialogTitle>Mark as Taken</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Confirm that you've taken "{selectedMedication?.medicineName}". You
            can add optional notes below.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="notes"
            label="Notes (optional)"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleMarkAsTakenCancel}>Cancel</Button>
          <Button
            onClick={handleMarkAsTakenConfirm}
            color="primary"
            variant="contained"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
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
    </Paper>
  );
};

export default MedicationList;
