"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Tag, Image as ImageIcon, X, Loader2, UploadCloud, CheckCircle2, Trash2, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

export default function CatalogPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  
  // Recipe Modal State
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [recipeIngredients, setRecipeIngredients] = useState<any[]>([]);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "Pasteles",
    price: "",
  });

  const supabase = createClient();

  useEffect(() => {
    fetchProducts();
    fetchInventoryItems();
  }, []);

  const fetchInventoryItems = async () => {
    const { data } = await supabase.from("inventory_items").select("*").order("name");
    if (data) setInventoryItems(data);
  };

  const fetchRecipe = async (productId: string) => {
    const { data } = await supabase
      .from("recipes")
      .select("*, inventory_items(name, unit)")
      .eq("product_id", productId);
    
    if (data) {
      setRecipeIngredients(data.map(r => ({
        id: r.id, // existing row id in recipes
        inventory_item_id: r.inventory_item_id,
        quantity: r.quantity,
        name: r.inventory_items?.name,
        unit: r.inventory_items?.unit
      })));
    } else {
      setRecipeIngredients([]);
    }
  };

  const openRecipeModal = async (product: any) => {
    setSelectedProduct(product);
    setRecipeIngredients([]);
    setIsRecipeModalOpen(true);
    await fetchRecipe(product.id);
  };

  const handleAddIngredientRow = () => {
    setRecipeIngredients([...recipeIngredients, { inventory_item_id: "", quantity: "" }]);
  };

  const handleRemoveIngredientRow = (index: number) => {
    const newIngredients = [...recipeIngredients];
    newIngredients.splice(index, 1);
    setRecipeIngredients(newIngredients);
  };

  const handleIngredientChange = (index: number, field: string, value: string) => {
    const newIngredients = [...recipeIngredients];
    newIngredients[index][field] = value;
    setRecipeIngredients(newIngredients);
  };

  const handleSaveRecipe = async () => {
    if (!selectedProduct) return;
    setIsSavingRecipe(true);

    // First delete old recipe for this product (full overwrite)
    await supabase.from("recipes").delete().eq("product_id", selectedProduct.id);

    // Insert new valid rows
    const validIngredients = recipeIngredients.filter(r => r.inventory_item_id && r.quantity);
    
    if (validIngredients.length > 0) {
      const inserts = validIngredients.map(r => ({
        product_id: selectedProduct.id,
        inventory_item_id: r.inventory_item_id,
        quantity: parseFloat(r.quantity)
      }));

      const { error } = await supabase.from("recipes").insert(inserts);
      if (error) alert("Error guardando receta: " + error.message);
    }

    setIsSavingRecipe(false);
    setIsRecipeModalOpen(false);
  };

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("catalog_products")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setProducts(data);
    setLoading(false);
  };

  const openEditModal = (product: any) => {
    setEditingProductId(product.id);
    setFormData({
      name: product.name || "",
      description: product.description || "",
      category: product.category || "Pasteles",
      price: product.price ? product.price.toString() : "",
    });
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingProductId(null);
    setFormData({ name: "", description: "", category: "Pasteles", price: "" });
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    let uploadedImageUrl = null;

    // 1. Upload image if exists
    if (selectedFile) {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('product-images')
        .upload(filePath, selectedFile);

      if (uploadError) {
        alert("Error subiendo la imagen: " + uploadError.message);
        setIsSubmitting(false);
        return;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);
        
      uploadedImageUrl = publicUrlData.publicUrl;
    }
    
    // 2. Save product to database
    let error;
    if (editingProductId) {
      const updateData: any = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: parseFloat(formData.price),
      };
      if (uploadedImageUrl) updateData.image_url = uploadedImageUrl;
      
      const { error: updateErr } = await supabase.from("catalog_products").update(updateData).eq("id", editingProductId);
      error = updateErr;
    } else {
      const { error: insertErr } = await supabase.from("catalog_products").insert({
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: parseFloat(formData.price),
        image_url: uploadedImageUrl,
      });
      error = insertErr;
    }

    setIsSubmitting(false);

    if (error) {
      alert("Error guardando producto: " + error.message);
    } else {
      setIsModalOpen(false);
      setFormData({ name: "", description: "", category: "Pasteles", price: "" });
      setSelectedFile(null);
      setEditingProductId(null);
      fetchProducts();
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Catálogo de Productos</h1>
          <p className="text-muted-foreground mt-1 text-lg">Define tus recetas, pasteles base y productos finales.</p>
        </div>
        
        <Button 
          onClick={openCreateModal}
          className="rounded-xl h-12 px-6 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 gap-2"
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold">Nuevo Producto</span>
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="bg-card p-4 rounded-2xl border border-border/50 shadow-sm flex items-center gap-3">
        <div className="bg-secondary/50 p-2 rounded-xl">
          <Search className="w-5 h-5 text-muted-foreground" />
        </div>
        <input 
          type="text" 
          placeholder="Buscar pasteles, categorías..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent border-none focus:outline-none text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-3xl border border-dashed border-border">
          <p className="text-muted-foreground">No tienes productos registrados aún en tu catálogo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-card border border-border/50 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col">
              
              {/* Image Placeholder or Actual Image */}
              <div className="h-48 bg-secondary/40 flex items-center justify-center text-muted-foreground group-hover:bg-primary/5 transition-colors relative overflow-hidden">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-10 h-10 opacity-30" />
                )}
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-foreground">{product.name}</h3>
                  <span className="text-lg font-black text-primary">${(product.price || 0).toFixed(2)}</span>
                </div>
                
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary/70 bg-primary/10 px-2.5 py-1 rounded-md w-fit mb-3">
                  <Tag className="w-3 h-3" />
                  {product.category}
                </div>

                <p className="text-muted-foreground text-sm flex-1">{product.description}</p>
                
                <div className="mt-6 pt-4 border-t border-border/50 flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 rounded-xl border-border hover:bg-secondary text-primary"
                    onClick={() => openEditModal(product)}
                  >
                    Editar Info
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 rounded-xl border-border hover:bg-secondary gap-2"
                    onClick={() => openRecipeModal(product)}
                  >
                    <ChefHat className="w-4 h-4" />
                    Receta
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Information Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-[2.5rem] p-8 shadow-xl border border-border/50 relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-2 bg-secondary/50 rounded-full hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
            
            <h2 className="text-2xl font-bold mb-6">{editingProductId ? "Editar Producto" : "Agregar al Catálogo"}</h2>
            
            <form onSubmit={handleSaveProduct} className="space-y-4">
              
              {/* Image Upload Area */}
              <div>
                <label className="block text-sm font-medium mb-1.5 ml-1">Foto del Producto (Opcional)</label>
                <div className="border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-background/50 hover:bg-secondary/30 transition-colors cursor-pointer relative overflow-hidden">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="w-8 h-8 text-green-500" />
                      <span className="text-sm font-medium text-foreground">{selectedFile.name}</span>
                      <span className="text-xs text-muted-foreground">Haz clic para cambiarla</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <UploadCloud className="w-8 h-8 mb-1 opacity-50" />
                      <span className="text-sm font-medium">Haz clic para subir desde tu dispositivo</span>
                      <span className="text-xs opacity-70">Soporta JPG, PNG, WEBP</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 ml-1">Nombre del Producto</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 ml-1">Categoría</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="Pasteles">Pasteles</option>
                    <option value="Cupcakes">Cupcakes</option>
                    <option value="Galletas">Galletas</option>
                    <option value="Gelatinas">Gelatinas</option>
                    <option value="Postres">Postres</option>
                    <option value="Kits">Kits</option>
                    <option value="Promociones">Promociones</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 ml-1">Precio Base ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 ml-1">Descripción</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none h-24"
                />
              </div>
              
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full rounded-xl h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-white mt-6"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Producto"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Recipe */}
      {isRecipeModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl rounded-[2.5rem] p-8 shadow-xl border border-border/50 relative max-h-[90vh] flex flex-col">
            <button 
              onClick={() => setIsRecipeModalOpen(false)}
              className="absolute top-6 right-6 p-2 bg-secondary/50 rounded-full hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
            
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <ChefHat className="w-6 h-6 text-primary" />
              Receta: {selectedProduct.name}
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              Agrega los ingredientes y las cantidades exactas que se usan para preparar 1 unidad de este producto. Al venderlo, se descontará automáticamente del inventario.
            </p>
            
            <div className="overflow-y-auto flex-1 space-y-4 pr-2">
              {recipeIngredients.length === 0 ? (
                <div className="text-center p-8 border-2 border-dashed border-border/50 rounded-2xl">
                  <p className="text-muted-foreground font-medium mb-4">No has asignado ingredientes a esta receta.</p>
                </div>
              ) : (
                recipeIngredients.map((ing, index) => {
                  // Find selected item to display its unit
                  const itemInfo = inventoryItems.find(i => i.id === ing.inventory_item_id);
                  const displayUnit = itemInfo ? itemInfo.unit : (ing.unit || "");

                  return (
                    <div key={index} className="flex items-center gap-3 bg-secondary/20 p-3 rounded-2xl border border-border/50">
                      <div className="flex-1">
                        <select
                          value={ing.inventory_item_id}
                          onChange={(e) => handleIngredientChange(index, "inventory_item_id", e.target.value)}
                          className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                        >
                          <option value="">Selecciona un ingrediente...</option>
                          {inventoryItems.map(item => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-32 relative">
                        <input 
                          type="number"
                          step="0.01"
                          placeholder="Cant..."
                          value={ing.quantity}
                          onChange={(e) => handleIngredientChange(index, "quantity", e.target.value)}
                          className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm pr-12"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                          {displayUnit}
                        </span>
                      </div>
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleRemoveIngredientRow(index)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  );
                })
              )}
              
              <Button 
                type="button"
                variant="outline"
                onClick={handleAddIngredientRow}
                className="w-full rounded-2xl border-dashed border-2 border-primary/30 text-primary hover:bg-primary/5 h-12"
              >
                <Plus className="w-4 h-4 mr-2" /> Agregar Ingrediente
              </Button>
            </div>

            <div className="mt-6 pt-4 border-t border-border/50">
              <Button 
                onClick={handleSaveRecipe}
                disabled={isSavingRecipe}
                className="w-full rounded-xl h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-white"
              >
                {isSavingRecipe ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Receta"}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
