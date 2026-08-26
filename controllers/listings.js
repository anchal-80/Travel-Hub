const Listing = require("../models/listing");


module.exports.index = async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index.ejs", { allListings });
};

module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id).populate({path: "reviews", populate: {path: "author",},}).populate("owner");
  if(!listing){
    req.flash("error", "Listing you requested for does not exist!");
    return res.redirect("/listings");
  }
  res.render("listings/show.ejs", { listing });
};

module.exports.createListing = async (req, res, next) => {

  let url = req.file.path;
  let filename = req.file.filename;

  const newListing = new Listing(req.body.listing);

  newListing.image = { url, filename };
  newListing.owner = req.user._id;

  // Convert location into latitude and longitude
  const location = `${req.body.listing.location}, ${req.body.listing.country}`;

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json`,
    {
      headers: {
        "User-Agent": "WanderLust/1.0"
      }
    }
  );

  const data = await response.json();

  if (data.length === 0) {
    req.flash("error", "Location not found!");
    return res.redirect("/listings/new");
  }

  const longitude = parseFloat(data[0].lon);
  const latitude = parseFloat(data[0].lat);

  // Store coordinates in MongoDB
  newListing.geometry = {
    type: "Point",
    coordinates: [longitude, latitude]
  };

  await newListing.save();

  req.flash("success", "New Listing Created!");
  res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    return res.redirect("/listings");
  }
  let originalImageUrl = listing.image.url;
  originalImageUrl = originalImageUrl.replace("/upload","/upload/w_250,h_150,c_fill");
  res.render("listings/edit.ejs", { listing , originalImageUrl});
};

module.exports.updateListing = async (req, res) => {
  const { id } = req.params;

  const { image, ...updateData } = req.body.listing;

  if (typeof req.file !== "undefined") {
    updateData.image = {
      url: req.file.path,
      filename: req.file.filename
    };
  }

  // If location or country is changed,
  // get the new coordinates
  if (updateData.location || updateData.country) {

    const location = `${updateData.location}, ${updateData.country}`;

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json`,
      {
        headers: {
          "User-Agent": "WanderLust/1.0"
        }
      }
    );

    const data = await response.json();

    if (data.length === 0) {
      req.flash("error", "Location not found!");
      return res.redirect(`/listings/${id}/edit`);
    }

    const longitude = parseFloat(data[0].lon);
    const latitude = parseFloat(data[0].lat);

    updateData.geometry = {
      type: "Point",
      coordinates: [longitude, latitude]
    };
  }

  await Listing.findByIdAndUpdate(id, updateData);

  req.flash("success", "Listing Updated!");
  res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
  const { id } = req.params;
  
  await Listing.findByIdAndDelete(id);
  req.flash("success", "Listing Deleted!");
  res.redirect("/listings");
};