
const express = require("express");

const {
    generateWebsite,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject,
    deploy,
    getDeployedWebsite

} = require("../Controller/websiteProject");

const isAuth = require("../Middleware/isAuth");

const projectRouter = express.Router();

projectRouter.post("/ai/generate", isAuth, generateWebsite);

projectRouter.get("/projects", isAuth, getProjects);

projectRouter.get("/projects/:projectId", isAuth, getProjectById);

projectRouter.patch("/projects/:projectId", isAuth, updateProject);

projectRouter.delete("/projects/:projectId", isAuth, deleteProject);

// Deploy

projectRouter.post( "/:projectId/deploy",isAuth,deploy);
projectRouter.get("/public/:slug", getDeployedWebsite);


module.exports = projectRouter;
