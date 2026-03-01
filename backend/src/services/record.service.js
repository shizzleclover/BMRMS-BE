import MedicalRecord from '../models/medicalRecord.model.js';
import Patient from '../models/patient.model.js';
import Clinic from '../models/clinic.model.js';
import * as ipfsService from './ipfs.service.js';
import * as blockchainService from './blockchain.service.js';
import * as encryptionService from './encryption.service.js';
import { AppError } from '../middleware/errorHandler.js';
import AuditLog from '../models/auditLog.model.js';

/**
 * Create a new medical record
 */
export const createRecord = async (recordData, file, doctorId, clinicId) => {
  const { patientId, recordType, title, description, diagnosis } = recordData;

  // 1. Verify patient exists
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new AppError('Patient not found', 404);
  }

  // 2. Encryption and IPFS Upload
  if (!file) {
    throw new AppError('Medical record file is required', 400);
  }

  // Encrypt file buffer
  const encryptedFile = encryptionService.encryptFile(file.buffer);

  // Upload to IPFS
  const ipfsResult = await ipfsService.uploadToIPFS(encryptedFile, {
    fileName: file.originalname,
    recordType,
  });

  // 3. Generate Record Hash for Blockchain
  const metadataToHash = {
    patientId: patient.patientNumber,
    recordType,
    title,
    diagnosis,
    ipfsHash: ipfsResult.ipfsHash,
    timestamp: Date.now(),
  };
  const recordHash = encryptionService.generateHash(metadataToHash);

  // 4. Pre-create MongoDB document to get the _id
  const medicalRecordToSave = new MedicalRecord({
    patientId,
    doctorId,
    clinicId,
    recordType,
    title,
    description,
    diagnosis,
    ipfsHash: ipfsResult.ipfsHash,
    fileMetadata: {
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      encryptionMethod: 'aes-256-gcm',
    },
    blockchainHash: recordHash,
  });

  // 5. Log on Blockchain using the new _id
  const blockchainResult = await blockchainService.storeRecordHash(
    medicalRecordToSave._id.toString(),
    patient._id.toString(),
    ipfsResult.ipfsHash,
    recordHash
  );

  // 6. Save to MongoDB with Tx Hash
  medicalRecordToSave.blockchainTxHash = blockchainResult?.transactionHash || null;
  const medicalRecord = await medicalRecordToSave.save();

  // 6. Audit Log
  await AuditLog.createLog({
    action: 'record_created',
    userId: doctorId,
    clinicId,
    targetResource: {
      resourceType: 'MedicalRecord',
      resourceId: medicalRecord._id,
    },
    details: {
      recordNumber: medicalRecord.recordNumber,
      ipfsHash: medicalRecord.ipfsHash,
    },
    blockchainTxHash: blockchainResult.transactionHash,
  });

  return medicalRecord;
};

/**
 * Get all medical records for a patient
 */
export const getPatientRecords = async (patientId, filters = {}) => {
  const query = { patientId, isDeleted: false, isLatestVersion: true, ...filters };

  return await MedicalRecord.find(query)
    .populate('doctorId', 'firstName lastName specialization')
    .populate('clinicId', 'name clinicCode')
    .sort({ visitDate: -1 });
};

/**
 * Get record by ID and decrypt if necessary
 */
export const getRecordById = async (id) => {
  const record = await MedicalRecord.findById(id)
    .populate('patientId')
    .populate('doctorId', 'firstName lastName specialization')
    .populate('clinicId', 'name clinicCode');

  if (!record || record.isDeleted) {
    throw new AppError('Medical record not found', 404);
  }

  return record;
};

/**
 * Download and decrypt record file from IPFS
 */
export const downloadRecordFile = async (recordId) => {
  const record = await MedicalRecord.findById(recordId);
  if (!record) throw new AppError('Record not found', 404);

  // 1. Retrieve from IPFS
  const encryptedBuffer = await ipfsService.retrieveFromIPFS(record.ipfsHash);

  // 2. Decrypt
  const decryptedBuffer = encryptionService.decryptFile(encryptedBuffer);

  return {
    buffer: decryptedBuffer,
    fileName: record.fileMetadata.fileName,
    fileType: record.fileMetadata.fileType,
  };
};

/**
 * Verify record integrity against blockchain
 */
export const verifyIntegrity = async (recordId) => {
  const record = await MedicalRecord.findById(recordId);
  if (!record) throw new AppError('Record not found', 404);

  const verification = await blockchainService.verifyRecordHash(
    record._id.toString(),
    record.blockchainHash
  );

  return verification;
};
