import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input, Button } from "@nextui-org/react";
import { IoIosArrowBack } from "react-icons/io";
import isAuth from "../components/isAuth";

function AddScheme() {
  const router = useRouter();
  const [schemeName, setSchemeName] = useState("");
  const [selectedImage, setSelectedImage] = useState("");
  const [imageUrls, setImageUrls] = useState([]);
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

  async function addScheme(event) {
    event.preventDefault();
    try {
      const standardizedSchemeName = capitalize(schemeName);

      const response = await fetch(
        `${API_URL}/scheme?scheme_name=${encodeURIComponent(
          standardizedSchemeName
        )}&file_url=${encodeURIComponent(selectedImage)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("loggedUserToken")}`, // Add token here as well
          },
          body: JSON.stringify({
            scheme_name: standardizedSchemeName,
            file_url: selectedImage,
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

  // Function to render images in a 3x3 grid
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
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="add-scheme-container">
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
              {imageUrls.length > 0 ? renderImages() : <p>No images available</p>}
            </div>
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
