import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Navigation, FreeMode } from "swiper/modules";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Footer from "../components/Footer";
import "./ProductDetail.css";
import "../App.css";
import { supabase } from "../supabase";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch products and set up real-time subscription
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setProducts(data);
      } catch (err) {
        console.error("Error fetching products:", err);
        setError("Échec du chargement des produits: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();

    // Set up real-time subscription
    const subscription = supabase
      .channel("products_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setProducts((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setProducts((prev) =>
              prev.map((item) =>
                item.id === payload.new.id ? payload.new : item
              )
            );
          } else if (payload.eventType === "DELETE") {
            setProducts((prev) =>
              prev.filter((item) => item.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const isProductList = location.pathname === "/products";

  if (isProductList) {
    return (
      <>
        <Navbar />
        <Hero />
        <section className="product-categories" id="products">
          <h2>Catégories de Produits</h2>
          {loading ? (
            <p>Chargement des produits...</p>
          ) : error ? (
            <p>{error}</p>
          ) : (
            <Swiper
              slidesPerView="auto"
              spaceBetween={15}
              centeredSlides={true}
              freeMode={true}
              navigation
              modules={[FreeMode, Navigation]}
              className="product-swiper"
            >
              {products.map((product) => (
                <SwiperSlide key={product.id} className="product-card">
                  <Link to={`/product/${product.id}`}>
                    <img
                      src={product.image_url || "https://via.placeholder.com/140"}
                      alt={product.name}
                      className="product-image"
                    />
                    <h3 className="product-name">{product.name}</h3>
                  </Link>
                </SwiperSlide>
              ))}
            </Swiper>
          )}
        </section>
        <Footer />
      </>
    );
  }

  const product = products.find((p) => p.id === parseInt(id));

  if (!product) {
    return <div>Produit non trouvé</div>;
  }

  const handleClose = () => {
    navigate("/products");
  };

  return (
    <>
      <Navbar />
      <Hero />
      <div className="product-detail">
        <div className="product-detail-content">
          <div className="detail-header">
            <h3>{product.name}</h3>
            <button className="close-button" onClick={handleClose}>×</button>
          </div>
          <div className="detail-body">
            <img
              src={product.image_url || "https://via.placeholder.com/140"}
              alt={product.name}
              className="detail-image"
            />
            <div className="detail-info">
              <p><strong>Usine:</strong> {product.usine}</p>
              <p><strong>Poids:</strong> {product.poids}</p>
              <p><strong>Type:</strong> {product.type}</p>
              <p><strong>Résistance:</strong> {product.résistance}</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ProductDetail;