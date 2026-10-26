import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  try { 
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  
    const pageOptions = {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
    };
  
    let pipelineArray = [
      {
        $match: {
          isPublished: true,
        },
      },
    ];
  
    if (query) {
      pipelineArray.push({
        $match: {
          title: {
            $regex: query,
            $options: "i",
          },
        },
      });
    }
  
    if (sortBy) {
      pipelineArray.push({
        $sort: {
          [sortBy]: sortType == "ascending" ? 1 : -1,
        },
      });
    }
  
    if (userId) {
      if (!isValidObjectId(userId)) throw new ApiError(400, "invalid userId");
      pipelineArray.push({
        $match: {
          owner: new mongoose.Types.ObjectId(userId),
        },
      });
    }
  
    pipelineArray.push({
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "channel",
      },
    });
  
    pipelineArray.push({
      $unwind: "$channel",
    });
  
    pipelineArray.push({
      $project: {
        _id: 1,
        owner: 1,
        title: 1,
        description: 1,
        duration: 1,
        thumbnail: 1,
        views: 1,
        createdAt: 1,
        channel: "$channel.username",
        channelFullName: "$channel.fullName",
        channelAvatar: "$channel.avatar",
      },
    });
  
    const videos = await Video.aggregate(pipelineArray)
      .limit(pageOptions.limit);
  
    return res.status(200).json(new ApiResponse(200, videos, "videos found"));
  } catch (error) {
    throw new ApiError(500, error.message);
  }
})

const publishAVideo = asyncHandler(async (req,res)=>{
    const { title, description} = req.body;

    if(!title || !description){
        throw new ApiError(400,"all fields are required")
    }

    const videoFilePath = req.files?.videoFile[0].path;
    if(!videoFilePath){
        throw new ApiError(400,"video file is missing");
    }

    const thumbnailPath = req.files?.thumbnail[0].path;
    if(!thumbnailPath){
        throw new ApiError(400,"thumbnail is missing");
    }

    const videoFile = await uploadOnCloudinary(videoFilePath)
    const thumbnail = await uploadOnCloudinary(thumbnailPath)

    if(!videoFile){
        throw new ApiError(400, "video file is required");
    }
    if(!thumbnail){
        throw new ApiError(400, "thumbnail is required");
    }
    

    const video = Video.create({
        videoFile:videoFile.url,
        thumbnail:thumbnail.url,
        owner:req.user._id,
        title,
        description,
        duration: videoFile.duration,
    })

    if(!video){
        throw new ApiError(500,"something went wrong")
    }
    
    return res.status(200)
        .json( new ApiResponse(200,video,"success"))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    if(!videoId){
        throw new ApiError(400,"video is missing")
    }
    const video_id= new mongoose.Types.ObjectId(videoId)
    const video = Video.findById(video_id)

    if(!video){
        throw new ApiError(400,"video was not found");
    }
    return res.status(200)
    .json(200,video,"video fetched successfully")
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    if(!videoId){
        throw new ApiError(400,"video is missing");
    }

    const {title,description}=req.body;

    if(!title || !description){
        throw new ApiError(400,"all fields are required")
    }

    const thumbnailPath = req.file?.thumbnail[0].path;

    if(!thumbnailPath){
        throw new ApiError(400,"thumbnail is missing");
    }

    const thumbnail = await uploadOnCloudinary(thumbnailPath);
    
    if(!thumbnail){
        throw new ApiError(400,"thumbnail is required");
    }

    const video_id=new mongoose.Types.ObjectId(videoId);

     if(!video_id){
        throw new ApiError(400,"video is missing");
    }

    const video = Video.findByIdAndUpdate(
        video_id,
        {
            $set:{
                title,
                description,
                thumbnail:thumbnail.url,
            }
        },
        {new:true}
    )

    if(!video){
        throw new ApiError(400,"something went wrong")
    }

    return res.status(200)
    .json(new ApiResponse(201,video,"updated video details successfully"))

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    if(!videoId){
        throw new ApiError(400,"video is missing");
    }

    const video_id=new mongoose.Types.ObjectId(videoId);

     if(!video_id){
        throw new ApiError(400,"video is missing");
    }

    const video = Video.findByIdAndDelete(video_id)

    if(!video){
        throw new ApiError(500,"something went wrong");
    }

    return res.status(201).
    json(new ApiResponse(200,video,"video deleted successfully"));
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    if(!videoId){
        throw new ApiError(400,"video is missing");
    }

    const video_id=new mongoose.Types.ObjectId(videoId);

     if(!video_id){
        throw new ApiError(400,"video is missing");
    }

    const video = Video.findByIdAndUpdate(
        video_id,
        {
            $set:{
                isPublished: !isPublished
            }
        },{
            new:true,
        }
    )

    if(!video){
        throw new ApiError(500,"something went wrong");
    }

    return res.status(201).
    json(new ApiResponse(200,video,"change successful"));
})

export{
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    getAllVideos
}