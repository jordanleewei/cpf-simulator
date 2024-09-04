import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input, Button } from "@nextui-org/react";
import { IoIosArrowBack } from "react-icons/io";
import isAuth from "../components/isAuth";
import DeleteModal from "../components/DeleteModal"; // Import the modal

function AddScheme() {
  const router = useRouter();
  const [schemeName, setSchemeName] = useState("");
  const [selectedImage, setSelectedImage] = useState("");
  const [imageUrls, setImageUrls] = useState([]);
  const [newImageFile, setNewImageFile] = useState(null);
  const [deleteImageUrl, setDeleteImageUrl] = useState(""); // Manage the image to delete
  const [showDeleteModal, setShowDeleteModal] = useState(false); // Control modal visibility

  // Get API URL from environment variables
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

  useEffect(() => {
    async function fetchImageUrls() {
      try {
        const response = await fetch(`${API_URL}/s3-images`);
        const data = await response.json();
        if (Array.isArray(data.image_urls)) {
          setImageUrls(data.image_urls);
        } else {
          console.error("Invalid data format: image_urls is not an array");
        }
      } catch (error) {
        console.error("Error fetching image URLs:", error);
      }
    }
    fetchImageUrls();
  }, [API_URL]);

  const handleCancel = () => {
    router.push("/schemes");
  };

  const capitalize = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // Function to handle image file upload without selecting the image
  const handleImageUpload = async () => {
    if (!newImageFile) return null;

    const formData = new FormData();
    formData.append("file", newImageFile);

    try {
      const response = await fetch(`${API_URL}/upload-image`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("loggedUserToken")}`, // Include token
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error("Image upload failed");
      }

      // Add the uploaded image to the list but don't select it
      setImageUrls((prev) => [...prev, data.s3_url]);
      setNewImageFile(null); // Clear the file input

      return data.s3_url;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  // Function to handle form submission (adding scheme)
  async function addScheme(event) {
    event.preventDefault();

    try {
      const standardizedSchemeName = capitalize(schemeName);

      // If a new image was uploaded, use its URL, otherwise use the selected one
      const uploadedImageUrl = newImageFile ? await handleImageUpload() : selectedImage;

      const response = await fetch(
        `${API_URL}/scheme?scheme_name=${encodeURIComponent(
          standardizedSchemeName
        )}&file_url=${encodeURIComponent(uploadedImageUrl)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("loggedUserToken")}`, // Add token here as well
          },
          body: JSON.stringify({
            scheme_name: standardizedSchemeName,
            file_url: uploadedImageUrl,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create scheme");
      }

      const data = await response.json();
      router.push("/schemes");
      return data;
    } catch (error) {
      console.error("Error creating scheme:", error);
      throw error;
    }
  }

  // Function to delete an image
  const handleDeleteImage = (imageUrl) => {
    setDeleteImageUrl(imageUrl);
    setShowDeleteModal(true); // Show the modal when delete is clicked
  };

  const confirmDeleteImage = async () => {
    try {
      const response = await fetch(`${API_URL}/delete-image?image_url=${encodeURIComponent(deleteImageUrl)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("loggedUserToken")}`, // Include token
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete image");
      }

      // Remove the image from the state after successful deletion
      setImageUrls(imageUrls.filter((url) => url !== deleteImageUrl));
      setSelectedImage(""); // Clear selected image if it's the deleted one
      setShowDeleteModal(false); // Hide the modal after deleting
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  };

  // Function to render images in a 3x3 grid with delete option
  const renderImages = () => {
    return (
      <div className="grid grid-cols-3 gap-4">
        {imageUrls.map((image, index) => (
          <div key={index} className="p-2">
            <img
              src={image}
              alt={`Scheme Image ${index + 1}`}
              className={`w-32 h-32 object-cover border-2 ${
                selectedImage === image ? "border-dark-green" : "border-gray-300"
              } cursor-pointer`}
              onClick={() => setSelectedImage(image)}
            />
            <Button
              className="mt-2 text-sm bg-red-500 text-white"
              onClick={() => handleDeleteImage(image)} // Trigger delete modal
            >
              Delete
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="add-scheme-container">
      {showDeleteModal && (
        <div className="w-full h-full flex justify-center items-center fixed top-0 left-0 z-40">
          <DeleteModal
            id={deleteImageUrl}
            setId={() => setShowDeleteModal(false)} // Close modal
            text="this image"
            handleDelete={confirmDeleteImage} // Confirm delete action
          />
          <div className="w-screen h-screen bg-gray-500/50 absolute z-30" />
        </div>
      )}
      <div className="items-start p-3">
        <Button
          startContent={<IoIosArrowBack />}
          className="flex items-center m-1 mx-3"
          onClick={() => router.push("/schemes")}
        >
          Back
        </Button>
      </div>
      <div className="add-scheme-card">
        <div className="w-1/2 flex flex-col justify-center items-center gap-4 place-self-center py-2 px-4">
          <span className="text-2xl font-bold my-3 place-self-start">
            Add Scheme
          </span>
          <div className="w-full pl-8">
            <div className="flex flex-row justify-start items-center mb-4">
              <span className="flex">
                <p className="text-red-500">*</p>Scheme Name
              </span>
              <Input
                isRequired
                placeholder="Enter scheme name"
                defaultValue=""
                onValueChange={(value) => setSchemeName(value)}
                className="flex border border-sage-green outline-2 py-1 w-80 ml-2"
              />
            </div>
            <div className="flex flex-col justify-start items-start pt-5">
              <span className="flex">
                <p className="text-red-500">*</p>Select Image
              </span>
              <div className="w-full ml-2">
                {imageUrls.length > 0 ? (
                  renderImages()
                ) : (
                  <p>No images available</p>
                )}
              </div>
              <span className="mt-4">Or upload a new image:</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNewImageFile(e.target.files[0])}
                className="mt-2"
              />
            </div>
          </div>
          <div className="flex justify-center items-end w-full mt-4">
            <Button
              className="bg-dark-green hover:bg-darker-green p-1 px-9 rounded-md text-white m-4"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-dark-green hover:bg-darker-green p-1 px-10 rounded-md text-white m-4"
              onClick={addScheme}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default isAuth(AddScheme);
