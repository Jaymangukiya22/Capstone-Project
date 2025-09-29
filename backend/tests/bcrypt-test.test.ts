import bcrypt from 'bcryptjs';

describe('Bcrypt Test', () => {
  it('should hash password 1234567890 correctly', async () => {
    const password = '1234567890';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    expect(hashedPassword).toBeDefined();
    expect(hashedPassword).not.toBe(password);
    expect(hashedPassword.length).toBeGreaterThan(50);
    
    // Verify the hash can be compared
    const isValid = await bcrypt.compare(password, hashedPassword);
    expect(isValid).toBe(true);
    
    // Verify wrong password fails
    const isInvalid = await bcrypt.compare('wrongpassword', hashedPassword);
    expect(isInvalid).toBe(false);
  });
  
  it('should generate different hashes for same password', async () => {
    const password = '1234567890';
    const hash1 = await bcrypt.hash(password, 10);
    const hash2 = await bcrypt.hash(password, 10);
    
    expect(hash1).not.toBe(hash2); // Different salts
    
    // But both should validate the same password
    expect(await bcrypt.compare(password, hash1)).toBe(true);
    expect(await bcrypt.compare(password, hash2)).toBe(true);
  });
});
