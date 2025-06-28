// models/RepoWebsite.js
import mongoose from "mongoose";

const repoWebsiteSchema = new mongoose.Schema(
  {
    clonedpath: {
      type: String,
    },
    url: {
      type: String,
      unique: true,
    },
    port: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const RepoWebsite = mongoose.model("RepoWebsite", repoWebsiteSchema);

export default RepoWebsite;
