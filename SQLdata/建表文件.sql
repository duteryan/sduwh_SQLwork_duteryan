-- 1. 用户表
CREATE TABLE Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(50) UNIQUE NOT NULL,
    Password VARCHAR(255) NOT NULL,
    RealName NVARCHAR(50),
    Phone VARCHAR(20) UNIQUE,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Role VARCHAR(20) NOT NULL DEFAULT 'student' 
        CHECK (Role IN ('student', 'admin')),
    RegistrationDate DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE) 
);

-- 2. 商品类别表
CREATE TABLE Category (
    CategoryID INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(50) UNIQUE NOT NULL,
    ParentID INT,
    Description NVARCHAR(MAX),
    FOREIGN KEY (ParentID) REFERENCES Category(CategoryID) ON DELETE NO ACTION
);

-- 3. 商品表
CREATE TABLE Item (
    ItemID INT IDENTITY(1,1) PRIMARY KEY,
    Title NVARCHAR(100) NOT NULL,
    Description NVARCHAR(MAX),
    Price DECIMAL(10,2) NOT NULL CHECK (Price > 0),
    Quantity INT NOT NULL DEFAULT 1 CHECK (Quantity >= 1),
    Status VARCHAR(20) NOT NULL DEFAULT 'available' 
        CHECK (Status IN ('available', 'ordered', 'completed')),
    PublishDate DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE), 
    Views INT NOT NULL DEFAULT 0 CHECK (Views >= 0),
    SellerID INT NOT NULL,
    CategoryID INT NOT NULL,
    FOREIGN KEY (SellerID) REFERENCES Users(UserID) ON DELETE NO ACTION,
    FOREIGN KEY (CategoryID) REFERENCES Category(CategoryID) ON DELETE NO ACTION
);

-- 4. 图片表
CREATE TABLE Image (
    ImageID INT IDENTITY(1,1) PRIMARY KEY,
    ItemID INT NOT NULL,
    Url VARCHAR(255) NOT NULL,
    SortOrder INT NOT NULL DEFAULT 1 CHECK (SortOrder >= 1),
    FOREIGN KEY (ItemID) REFERENCES Item(ItemID) ON DELETE CASCADE
);

-- 5. 收货地址表
CREATE TABLE Address (
    AddressID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    Recipient NVARCHAR(50) NOT NULL,
    Phone VARCHAR(20) NOT NULL,
    Detail NVARCHAR(200) NOT NULL,
    IsDefault BIT NOT NULL DEFAULT 0,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);

-- 6. 订单表
CREATE TABLE Orders (
    OrderID INT IDENTITY(1,1) PRIMARY KEY,
    ItemID INT NOT NULL UNIQUE,
    BuyerID INT NOT NULL,
    OrderDate DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),  
    Amount DECIMAL(10,2) NOT NULL CHECK (Amount > 0),
    Status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (Status IN ('pending', 'shipped', 'completed')),
    AddressID INT,
    FOREIGN KEY (ItemID) REFERENCES Item(ItemID) ON DELETE CASCADE,
    FOREIGN KEY (BuyerID) REFERENCES Users(UserID) ON DELETE NO ACTION,
    FOREIGN KEY (AddressID) REFERENCES Address(AddressID) ON DELETE SET NULL
);

-- 7. 交易日志表
CREATE TABLE TransactionLog (
    LogID INT IDENTITY(1,1) PRIMARY KEY,
    OrderID INT NOT NULL,
    Action NVARCHAR(50) NOT NULL,
    Timestamp DATETIME NOT NULL DEFAULT GETDATE(), 
    OperatorID INT NOT NULL,
    Remarks NVARCHAR(255),
    FOREIGN KEY (OrderID) REFERENCES Orders(OrderID) ON DELETE CASCADE,
    FOREIGN KEY (OperatorID) REFERENCES Users(UserID) ON DELETE CASCADE
);

-- 8. 评价表
CREATE TABLE Review (
    ReviewID INT IDENTITY(1,1) PRIMARY KEY,
    OrderID INT NOT NULL UNIQUE,
    Rating TINYINT NOT NULL CHECK (Rating BETWEEN 1 AND 5),
    Comment NVARCHAR(MAX),
    ReviewDate DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),  
    FOREIGN KEY (OrderID) REFERENCES Orders(OrderID) ON DELETE CASCADE
);


-- 1. 商品发布者（高频查询）
CREATE NONCLUSTERED INDEX IDX_Item_SellerID 
ON Item(SellerID);
-- 2. 商品状态 + 分类（分类浏览待售商品）
CREATE NONCLUSTERED INDEX IDX_Item_Status_CategoryID 
ON Item(Status, CategoryID);
-- 3. 商品状态 + 发布者（卖家后台）
CREATE NONCLUSTERED INDEX IDX_Item_Status_SellerID 
ON Item(Status, SellerID);
-- 4. 订单状态（订单列表 / 管理）
CREATE NONCLUSTERED INDEX IDX_Orders_Status 
ON Orders(Status);
-- 5. 订单买家 + 状态（买家查看订单）
CREATE NONCLUSTERED INDEX IDX_Orders_BuyerID_Status 
ON Orders(BuyerID, Status);
